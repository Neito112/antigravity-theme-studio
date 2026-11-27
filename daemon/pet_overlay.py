#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Antigravity Companion Pet Desktop Overlay (Windows / Cross-Platform PyQt)
Transparent, click-through always-on-top Desktop Pet + Floating Smoked Glass Chat.
Shows automatically when Antigravity is minimized or in the background (or always).
"""

import argparse
import base64
import ctypes
import ctypes.wintypes
import io
import json
import math
import os
import random
import signal
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

from PIL import Image, ImageFilter

try:
    from PyQt6.QtCore import QByteArray, QEvent, QObject, QPoint, QRect, QRectF, QSize, Qt, QTimer, pyqtSignal
    from PyQt6.QtGui import QAction, QColor, QCursor, QFont, QImage, QLinearGradient, QPainter, QPainterPath, QPen, QPixmap, QGuiApplication
    from PyQt6.QtSvg import QSvgRenderer
    from PyQt6.QtWidgets import (
        QApplication,
        QFrame,
        QHBoxLayout,
        QLabel,
        QMenu,
        QPlainTextEdit,
        QPushButton,
        QVBoxLayout,
        QWidget,
    )
    QT_VER = 6
except ImportError:
    from PyQt5.QtCore import QByteArray, QEvent, QObject, QPoint, QRect, QRectF, QSize, Qt, QTimer, pyqtSignal
    from PyQt5.QtGui import QColor, QCursor, QFont, QImage, QLinearGradient, QPainter, QPainterPath, QPen, QPixmap, QGuiApplication
    from PyQt5.QtSvg import QSvgRenderer
    from PyQt5.QtWidgets import (
        QAction,
        QApplication,
        QFrame,
        QHBoxLayout,
        QLabel,
        QMenu,
        QPlainTextEdit,
        QPushButton,
        QVBoxLayout,
        QWidget,
    )
    QT_VER = 5


def qt_enum(cls, name):
    return getattr(cls, name)


# 8 columns x 11 rows sprite atlas matching engine/core.js PET_SHEET
COLS = 8
ROWS = 11
CELL_W = 192
CELL_H = 208
DISPLAY_W = 104
DISPLAY_H = round(DISPLAY_W * CELL_H / CELL_W)  # ~113 px

# Row animations: (rowIndex, count, minMs, maxMs)
ROW_ANIM = {
    'idle': [(0, c, 320, 640) for c in range(4)] + [(0, 4, 240, 320), (0, 5, 240, 320)],
    'running-right': [(1, c, 95, 160) for c in range(8)],
    'running-left': [(2, c, 95, 160) for c in range(8)],
    'waving': [(3, c, 120, 220) for c in range(4)],
    'jumping': [(4, c, 110, 200) for c in range(5)],
    'failed': [(5, c, 120, 200) for c in range(8)],
    'waiting': [(6, c, 120, 210) for c in range(6)],
    'running': [(7, c, 95, 160) for c in range(6)],
    'review': [(8, c, 120, 220) for c in range(6)],
}
LOOK_STATES = {'idle', 'running', 'waving', 'ready'}


# ── Win32 Helpers (foreground Antigravity window detection & native audio) ────
IS_WIN = sys.platform == 'win32'
if IS_WIN:
    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32
    winmm = ctypes.windll.winmm
    PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
    _pid_name_cache = {}

    def get_process_name_by_pid(pid):
        if not pid:
            return ''
        if pid in _pid_name_cache:
            return _pid_name_cache[pid]
        name = ''
        h = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
        if h:
            try:
                buf = ctypes.create_unicode_buffer(520)
                sz = ctypes.wintypes.DWORD(520)
                if kernel32.QueryFullProcessImageNameW(h, 0, buf, ctypes.byref(sz)):
                    name = os.path.basename(buf.value).lower()
            finally:
                kernel32.CloseHandle(h)
        if len(_pid_name_cache) > 512:
            _pid_name_cache.clear()
        if name:
            _pid_name_cache[pid] = name
        return name

    SHELL_TRANSIENT_CLASSES = {
        'shell_traywnd',
        'shell_secondarytraywnd',
        'notifyiconoverflowwindow',
        'tasklistthumbnailwnd',
        'multitaskingviewframe',
        'windows.ui.core.corewindow',
    }

    def get_hwnd_class(hwnd):
        try:
            buf = ctypes.create_unicode_buffer(256)
            user32.GetClassNameW(hwnd, buf, 256)
            return buf.value.strip().lower()
        except Exception:
            return ''

    def find_antigravity_main_hwnd():
        found = [0]
        EnumProc = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)

        def _cb(hwnd, _lp):
            if not user32.IsWindowVisible(hwnd):
                return True
            pid = ctypes.wintypes.DWORD(0)
            user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            if get_process_name_by_pid(pid.value) == 'antigravity.exe':
                rect = ctypes.wintypes.RECT()
                if user32.GetWindowRect(hwnd, ctypes.byref(rect)):
                    if (rect.right - rect.left) > 300 or user32.IsIconic(hwnd):
                        found[0] = hwnd
                        return False
            return True

        user32.EnumWindows(EnumProc(_cb), 0)
        return found[0]

    def check_overlay_should_show(own_pid, currently_visible):
        try:
            agy_hwnd = find_antigravity_main_hwnd()
            if not agy_hwnd or user32.IsIconic(agy_hwnd) or not user32.IsWindowVisible(agy_hwnd):
                return True
            fg = user32.GetForegroundWindow()
            if not fg:
                return currently_visible
            pid = ctypes.wintypes.DWORD(0)
            user32.GetWindowThreadProcessId(fg, ctypes.byref(pid))
            if pid.value == own_pid:
                return True
            pname = get_process_name_by_pid(pid.value)
            if pname == 'antigravity.exe' and not user32.IsIconic(fg):
                return False
            cls = get_hwnd_class(fg)
            if cls in SHELL_TRANSIENT_CLASSES:
                # Taskbar / Start click while Antigravity is still visible behind it: keep hidden so no double-pet split
                return currently_visible
            return True
        except Exception:
            return False

    _mci_lock = threading.Lock()
    _mci_alias = 'agy_pet_voice_alias'

    def play_mp3_native(file_path, volume_pct=85):
        if not file_path or not os.path.exists(file_path):
            return
        vol_1000 = max(0, min(1000, int(volume_pct) * 10))
        abs_path = os.path.abspath(file_path).replace('"', '')

        def _worker():
            with _mci_lock:
                try:
                    winmm.mciSendStringW(f'close {_mci_alias}', None, 0, None)
                    winmm.mciSendStringW(f'open "{abs_path}" type mpegvideo alias {_mci_alias}', None, 0, None)
                    winmm.mciSendStringW(f'setaudio {_mci_alias} volume to {vol_1000}', None, 0, None)
                    winmm.mciSendStringW(f'play {_mci_alias}', None, 0, None)
                except Exception:
                    pass

        threading.Thread(target=_worker, daemon=True).start()
else:
    def is_antigravity_foreground(own_pid):
        return False

    def play_mp3_native(file_path, volume_pct=85):
        pass


def parse_hex_color(raw, fallback='#38bdf8'):
    s = str(raw or '').strip()
    if s.startswith('#') and len(s) in (4, 7, 9):
        c = QColor(s)
        if c.isValid():
            return c.name()
    return fallback


class StatePoller(QObject):
    stateUpdated = pyqtSignal(dict)
    chatResult = pyqtSignal(bool, str)

    def __init__(self, base_url, root_dir):
        super().__init__()
        self.base_url = base_url.rstrip('/')
        self.root_dir = root_dir
        self._stop = False
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._last_raw = ''

    def start(self):
        self._thread.start()

    def stop(self):
        self._stop = True

    def _loop(self):
        fail_count = 0
        while not self._stop:
            try:
                req = urllib.request.Request(f'{self.base_url}/api/overlay/state', method='GET')
                with urllib.request.urlopen(req, timeout=2.0) as resp:
                    raw = resp.read().decode('utf-8', errors='replace')
                    data = json.loads(raw)
                    fail_count = 0
                    if data and isinstance(data, dict) and data.get('ok'):
                        self.stateUpdated.emit(data)
            except Exception:
                fail_count += 1
                if fail_count >= 15:
                    # Daemon likely stopped
                    pass
            time.sleep(0.55)

    def send_chat(self, text):
        def _worker():
            try:
                payload = json.dumps({'text': text}).encode('utf-8')
                req = urllib.request.Request(
                    f'{self.base_url}/api/overlay/chat',
                    data=payload,
                    headers={'Content-Type': 'application/json'},
                    method='POST',
                )
                with urllib.request.urlopen(req, timeout=6.0) as resp:
                    data = json.loads(resp.read().decode('utf-8', errors='replace'))
                    self.chatResult.emit(bool(data.get('ok')), str(data.get('error') or ''))
            except Exception as exc:
                self.chatResult.emit(False, str(exc))

        threading.Thread(target=_worker, daemon=True).start()

    def post_action(self, endpoint, body=None):
        def _worker():
            try:
                payload = json.dumps(body or {}).encode('utf-8')
                req = urllib.request.Request(
                    f'{self.base_url}{endpoint}',
                    data=payload,
                    headers={'Content-Type': 'application/json'},
                    method='POST',
                )
                with urllib.request.urlopen(req, timeout=3.0) as resp:
                    resp.read()
            except Exception:
                pass

        threading.Thread(target=_worker, daemon=True).start()


class GlassThemedFrame(QFrame):
    """50% translucent smoked-glass card painted with the active theme's blurred wallpaper and gradient frame."""

    def __init__(self, parent=None, radius=15, wp_opacity=0.42, base_alpha=128):
        super().__init__(parent)
        self._radius = radius
        self._wp_opacity = wp_opacity
        self._base_alpha = base_alpha
        self._wp_pixmap = None
        self._primary = '#38bdf8'
        self._secondary = '#c084fc'

    def set_theme_visuals(self, wp_pixmap, primary, secondary):
        self._wp_pixmap = wp_pixmap
        self._primary = parse_hex_color(primary, '#38bdf8')
        self._secondary = parse_hex_color(secondary, '#c084fc')
        self.update()

    def paintEvent(self, event):
        p = QPainter(self)
        if QT_VER == 6:
            p.setRenderHint(QPainter.RenderHint.Antialiasing, True)
            p.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform, True)
        else:
            p.setRenderHint(QPainter.Antialiasing, True)
            p.setRenderHint(QPainter.SmoothPixmapTransform, True)

        rect = QRectF(0.75, 0.75, max(1.0, self.width() - 1.5), max(1.0, self.height() - 1.5))
        path = QPainterPath()
        path.addRoundedRect(rect, self._radius, self._radius)
        p.setClipPath(path)

        # 50% translucent dark smoked glass base
        p.fillPath(path, QColor(8, 12, 22, self._base_alpha))

        # Blurred theme wallpaper texture inside composer / reply card (cover crop)
        if self._wp_pixmap and not self._wp_pixmap.isNull():
            pw, ph = self._wp_pixmap.width(), self._wp_pixmap.height()
            ww, wh = max(1, self.width()), max(1, self.height())
            scale = max(ww / pw, wh / ph)
            dw, dh = pw * scale, ph * scale
            dx = (ww - dw) / 2.0
            dy = (wh - dh) / 2.0
            p.setOpacity(self._wp_opacity)
            p.drawPixmap(QRectF(dx, dy, dw, dh), self._wp_pixmap, QRectF(0, 0, pw, ph))
            p.setOpacity(1.0)
            # Light dark veil to keep 50% glass feel & crisp text readability
            p.fillPath(path, QColor(7, 10, 19, 108))

        p.setClipping(False)
        grad = QLinearGradient(0, 0, self.width(), self.height())
        c1 = QColor(self._primary)
        c1.setAlpha(175)
        c2 = QColor(self._secondary)
        c2.setAlpha(150)
        grad.setColorAt(0.0, c1)
        grad.setColorAt(1.0, c2)
        p.setPen(QPen(grad, 1.35))
        p.drawRoundedRect(rect, self._radius, self._radius)
        p.end()


class ChatInputBox(QPlainTextEdit):
    submitRequested = pyqtSignal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setPlaceholderText('Ask anything, hoặc gõ để chat với Antigravity...')
        self.setMaximumHeight(112)
        self.setMinimumHeight(50)
        self.setFixedHeight(50)
        self.textChanged.connect(self._adjust_height)

    def _adjust_height(self):
        doc = self.document()
        h = int(doc.size().height()) + 16
        self.setFixedHeight(max(50, min(112, h)))

    def keyPressEvent(self, event):
        key = event.key()
        mods = event.modifiers()
        if QT_VER == 6:
            ret_keys = (Qt.Key.Key_Return, Qt.Key.Key_Enter)
            shift_mod = Qt.KeyboardModifier.ShiftModifier
        else:
            ret_keys = (Qt.Key_Return, Qt.Key_Enter)
            shift_mod = Qt.ShiftModifier
        if key in ret_keys and not (mods & shift_mod):
            self.submitRequested.emit()
            return
        super().keyPressEvent(event)


class PetSpriteLabel(QWidget):
    clicked = pyqtSignal()
    dragMoved = pyqtSignal(QPoint)
    dragEnded = pyqtSignal(QPoint)
    contextRequested = pyqtSignal(QPoint)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedSize(DISPLAY_W, DISPLAY_H)
        if QT_VER == 6:
            self.setCursor(Qt.CursorShape.OpenHandCursor)
        else:
            self.setCursor(Qt.OpenHandCursor)
        self._pixmap = None
        self._drag_origin = None
        self._win_origin = None
        self._moved = False

    def set_frame_pixmap(self, pm):
        self._pixmap = pm
        self.update()

    def paintEvent(self, event):
        if not self._pixmap or self._pixmap.isNull():
            return
        p = QPainter(self)
        if QT_VER == 6:
            p.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform, True)
            p.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        else:
            p.setRenderHint(QPainter.SmoothPixmapTransform, True)
            p.setRenderHint(QPainter.Antialiasing, True)
        p.drawPixmap(0, 0, DISPLAY_W, DISPLAY_H, self._pixmap)
        p.end()

    def mousePressEvent(self, event):
        if QT_VER == 6:
            left_btn = Qt.MouseButton.LeftButton
            right_btn = Qt.MouseButton.RightButton
            gpos = event.globalPosition().toPoint()
            closed_hand = Qt.CursorShape.ClosedHandCursor
        else:
            left_btn = Qt.LeftButton
            right_btn = Qt.RightButton
            gpos = event.globalPos()
            closed_hand = Qt.ClosedHandCursor

        if event.button() == left_btn:
            self._drag_origin = gpos
            self._win_origin = self.window().pos()
            self._moved = False
            self.setCursor(closed_hand)
            event.accept()
            return
        if event.button() == right_btn:
            self.contextRequested.emit(gpos)
            event.accept()
            return
        super().mousePressEvent(event)

    def mouseMoveEvent(self, event):
        if self._drag_origin is not None:
            gpos = event.globalPosition().toPoint() if QT_VER == 6 else event.globalPos()
            delta = gpos - self._drag_origin
            if abs(delta.x()) + abs(delta.y()) > 4:
                self._moved = True
            if self._moved:
                self.dragMoved.emit(self._win_origin + delta)
            event.accept()
            return
        super().mouseMoveEvent(event)

    def mouseReleaseEvent(self, event):
        if QT_VER == 6:
            open_hand = Qt.CursorShape.OpenHandCursor
        else:
            open_hand = Qt.OpenHandCursor
        if self._drag_origin is not None:
            was_moved = self._moved
            self._drag_origin = None
            self._moved = False
            self.setCursor(open_hand)
            if was_moved:
                self.dragEnded.emit(self.window().pos())
            else:
                self.clicked.emit()
            event.accept()
            return
        super().mouseReleaseEvent(event)


class DesktopPetOverlay(QWidget):
    def __init__(self, root_dir, media_port):
        super().__init__()
        self.root_dir = root_dir
        self.media_port = media_port
        self.base_url = f'http://127.0.0.1:{media_port}'
        self.own_pid = os.getpid()

        if QT_VER == 6:
            flags = Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint | Qt.WindowType.Tool
            self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)
            self.setAttribute(Qt.WidgetAttribute.WA_ShowWithoutActivating, True)
        else:
            flags = Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.Tool
            self.setAttribute(Qt.WA_TranslucentBackground, True)
            self.setAttribute(Qt.WA_ShowWithoutActivating, True)
        self.setWindowFlags(flags)

        self.theme_state = {
            'themeName': 'WLOP Cosmic',
            'petName': 'Seraph',
            'petSpriteUrl': 'assets/pets/pet_wlop.webp',
            'desktopOverlayMode': 'auto',
            'petEnabled': True,
            'syncPetVoice': True,
            'taskVoiceEnabled': True,
            'taskVoiceVol': 85,
            'agentState': 'idle',
            'latestReply': '',
            'replySeq': '',
            'pageTitle': 'Antigravity',
            'petVoices': [],
            'colors': {'primary': '#fbbf24', 'secondary': '#38bdf8'},
        }
        self._frames_cache = {}
        self._loaded_sprite_key = ''
        self._wp_pixmap = None
        self._loaded_wp_key = ''
        self._loaded_sticker_key = ''
        self._sticker_size = (88, 28)
        self._frame_idx = 0
        self._chat_open = False
        self._reply_dismissed_seq = ''
        self._prev_agent_state = 'idle'
        self._reaction_state = ''
        self._reaction_until = 0.0
        self._last_sending_at = 0.0
        self._user_moved = False
        self._pos_x = None
        self._pos_y = None
        self._last_synced_pet_pos = None
        self._last_reported_vis = None
        self._drag_last_x = None
        self._drag_speed_until = 0.0

        self._build_ui()
        self._apply_styles()

        self.poller = StatePoller(self.base_url, self.root_dir)
        self.poller.stateUpdated.connect(self._on_state_updated)
        self.poller.chatResult.connect(self._on_chat_result)
        self.poller.start()

        self.anim_timer = QTimer(self)
        self.anim_timer.timeout.connect(self._tick_animation)
        self.anim_timer.start(135)

        self.vis_timer = QTimer(self)
        self.vis_timer.timeout.connect(self._tick_visibility)
        self.vis_timer.start(240)

        self._reply_hide_timer = QTimer(self)
        self._reply_hide_timer.setSingleShot(True)
        self._reply_hide_timer.timeout.connect(self._auto_hide_reply_card)

        self._load_sprite_sheet('assets/pets/pet_wlop.webp')
        self._place_initial()

    def _build_ui(self):
        root_lay = QVBoxLayout(self)
        root_lay.setContentsMargins(10, 8, 10, 10)
        root_lay.setSpacing(6)
        if QT_VER == 6:
            root_lay.setAlignment(Qt.AlignmentFlag.AlignHCenter | Qt.AlignmentFlag.AlignBottom)
        else:
            root_lay.setAlignment(Qt.AlignHCenter | Qt.AlignBottom)

        # ── Compact Reply Bubble (appears when Antigravity replies or while chat open) ──
        self.reply_card = GlassThemedFrame(self, radius=14, wp_opacity=0.35, base_alpha=128)
        self.reply_card.setObjectName('agyOverlayReplyCard')
        self.reply_card.setFixedWidth(342)
        self.reply_card.hide()
        r_lay = QVBoxLayout(self.reply_card)
        r_lay.setContentsMargins(12, 9, 10, 10)
        r_lay.setSpacing(6)

        r_head = QHBoxLayout()
        r_head.setContentsMargins(0, 0, 0, 0)
        self.reply_title = QLabel('Antigravity', self.reply_card)
        self.reply_title.setObjectName('agyOverlayReplyTitle')
        self.reply_speak_btn = QPushButton('🔊', self.reply_card)
        self.reply_speak_btn.setObjectName('agyOverlayMiniBtn')
        self.reply_speak_btn.setFixedSize(22, 22)
        self.reply_speak_btn.setToolTip('Nghe Pet nói')
        self.reply_speak_btn.clicked.connect(self._speak_pet_voice)
        self.reply_open_btn = QPushButton('↗', self.reply_card)
        self.reply_open_btn.setObjectName('agyOverlayMiniBtn')
        self.reply_open_btn.setFixedSize(22, 22)
        self.reply_open_btn.setToolTip('Mở cửa sổ Antigravity')
        self.reply_open_btn.clicked.connect(self._restore_antigravity)
        self.reply_close_btn = QPushButton('×', self.reply_card)
        self.reply_close_btn.setObjectName('agyOverlayMiniBtn')
        self.reply_close_btn.setFixedSize(22, 22)
        self.reply_close_btn.clicked.connect(self._dismiss_reply_card)
        r_head.addWidget(self.reply_title, 1)
        r_head.addWidget(self.reply_speak_btn)
        r_head.addWidget(self.reply_open_btn)
        r_head.addWidget(self.reply_close_btn)

        self.reply_body = QLabel('', self.reply_card)
        self.reply_body.setObjectName('agyOverlayReplyBody')
        self.reply_body.setWordWrap(True)
        self.reply_body.setFixedWidth(318)
        r_lay.addLayout(r_head)
        r_lay.addWidget(self.reply_body)
        root_lay.addWidget(self.reply_card, 0, Qt.AlignmentFlag.AlignHCenter if QT_VER == 6 else Qt.AlignHCenter)

        # ── Pet Sprite ──
        self.pet_widget = PetSpriteLabel(self)
        self.pet_widget.clicked.connect(self._toggle_chat)
        self.pet_widget.dragMoved.connect(self._on_drag_move)
        self.pet_widget.dragEnded.connect(self._on_drag_end)
        self.pet_widget.contextRequested.connect(self._show_context_menu)
        root_lay.addWidget(self.pet_widget, 0, Qt.AlignmentFlag.AlignHCenter if QT_VER == 6 else Qt.AlignHCenter)

        # ── Status Pill (<Pet> · Idle/Thinking/Ready) ──
        self.status_pill = QPushButton('Seraph · Idle ▾', self)
        self.status_pill.setObjectName('agyOverlayPill')
        self.status_pill.clicked.connect(self._toggle_chat)
        if QT_VER == 6:
            self.status_pill.setCursor(Qt.CursorShape.PointingHandCursor)
            self.status_pill.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        else:
            self.status_pill.setCursor(Qt.PointingHandCursor)
            self.status_pill.setContextMenuPolicy(Qt.CustomContextMenu)
        self.status_pill.customContextMenuRequested.connect(lambda _p: self._show_context_menu(QCursor.pos()))
        root_lay.addWidget(self.status_pill, 0, Qt.AlignmentFlag.AlignHCenter if QT_VER == 6 else Qt.AlignHCenter)

        # ── Floating In-App Style Composer (Wallpaper 50% Glass + Ornament Sticker) ──
        self.chat_card = GlassThemedFrame(self, radius=15, wp_opacity=0.46, base_alpha=128)
        self.chat_card.setObjectName('agyOverlayChatCard')
        self.chat_card.setFixedWidth(342)
        self.chat_card.hide()
        c_lay = QVBoxLayout(self.chat_card)
        c_lay.setContentsMargins(11, 10, 11, 9)
        c_lay.setSpacing(7)

        self.chat_input = ChatInputBox(self.chat_card)
        self.chat_input.setObjectName('agyOverlayChatInput')
        self.chat_input.submitRequested.connect(self._submit_chat)
        c_lay.addWidget(self.chat_input)

        c_foot = QHBoxLayout()
        c_foot.setContentsMargins(2, 0, 0, 0)
        c_foot.setSpacing(6)
        self.chat_hint = QLabel('✦ Gemini 4 · Turbo', self.chat_card)
        self.chat_hint.setObjectName('agyOverlayHint')
        self.restore_btn = QPushButton('Mở App', self.chat_card)
        self.restore_btn.setObjectName('agyOverlaySecondaryBtn')
        self.restore_btn.clicked.connect(self._restore_antigravity)
        self.send_btn = QPushButton('↑', self.chat_card)
        self.send_btn.setObjectName('agyOverlaySendBtn')
        self.send_btn.setFixedSize(28, 28)
        self.send_btn.setToolTip('Gửi vào Antigravity (Enter)')
        self.send_btn.clicked.connect(self._submit_chat)
        c_foot.addWidget(self.chat_hint, 1)
        c_foot.addWidget(self.restore_btn)
        c_foot.addWidget(self.send_btn)
        c_lay.addLayout(c_foot)
        root_lay.addWidget(self.chat_card, 0, Qt.AlignmentFlag.AlignHCenter if QT_VER == 6 else Qt.AlignHCenter)

        # Ornament SVG sticker floating cleanly above top-right corner of chat_card (matching in-app composer)
        self.sticker_label = QLabel(self)
        if QT_VER == 6:
            self.sticker_label.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents, True)
        else:
            self.sticker_label.setAttribute(Qt.WA_TransparentForMouseEvents, True)
        self.sticker_label.hide()

    def _apply_styles(self):
        colors = self.theme_state.get('colors') or {}
        primary = parse_hex_color(colors.get('primary'), '#38bdf8')
        secondary = parse_hex_color(colors.get('secondary'), '#c084fc')
        pc = QColor(primary)
        border_rgba = f'rgba({pc.red()}, {pc.green()}, {pc.blue()}, 125)'
        soft_bg_rgba = f'rgba({pc.red()}, {pc.green()}, {pc.blue()}, 34)'

        self.setStyleSheet(f"""
            QWidget {{
                font-family: "Segoe UI", system-ui, sans-serif;
            }}
            #agyOverlayPill {{
                background: rgba(8, 12, 22, 160);
                color: #f8fafc;
                border: 1px solid {border_rgba};
                border-radius: 12px;
                padding: 4px 12px;
                font-size: 11.5px;
                font-weight: 600;
            }}
            #agyOverlayPill:hover {{
                background: rgba(14, 20, 36, 195);
                border-color: {primary};
            }}
            #agyOverlayChatCard, #agyOverlayReplyCard {{
                background: transparent;
                border: none;
            }}
            #agyOverlayReplyTitle {{
                color: {primary};
                font-size: 11px;
                font-weight: 700;
            }}
            #agyOverlayReplyBody {{
                color: #f8fafc;
                font-size: 12px;
            }}
            #agyOverlayChatInput {{
                background: rgba(4, 7, 14, 118);
                color: #f8fafc;
                border: 1px solid rgba(255, 255, 255, 42);
                border-radius: 10px;
                padding: 7px 9px;
                font-size: 12.5px;
                selection-background-color: {primary};
            }}
            #agyOverlayChatInput:focus {{
                border: 1px solid {primary};
            }}
            #agyOverlayHint {{
                color: #cbd5e1;
                font-size: 11px;
                font-weight: 500;
            }}
            #agyOverlaySendBtn {{
                background: #f8fafc;
                color: #080c14;
                border: none;
                border-radius: 14px;
                font-size: 14px;
                font-weight: 800;
            }}
            #agyOverlaySendBtn:hover {{
                background: {primary};
            }}
            #agyOverlaySecondaryBtn, #agyOverlayMiniBtn {{
                background: {soft_bg_rgba};
                color: #f1f5f9;
                border: 1px solid rgba(255, 255, 255, 42);
                border-radius: 8px;
                padding: 4px 9px;
                font-size: 11px;
                font-weight: 600;
            }}
            #agyOverlayMiniBtn {{
                padding: 0px;
                border-radius: 6px;
            }}
            #agyOverlaySecondaryBtn:hover, #agyOverlayMiniBtn:hover {{
                border-color: {primary};
            }}
        """)

        self.reply_card.set_theme_visuals(self._wp_pixmap, primary, secondary)
        self.chat_card.set_theme_visuals(self._wp_pixmap, primary, secondary)

    def _load_wallpaper_visual(self, wp_url):
        key = str(wp_url or '').strip()
        if key == self._loaded_wp_key:
            return
        self._loaded_wp_key = key
        if not key:
            self._wp_pixmap = None
            return
        im = None
        try:
            if key.startswith('data:image/') and ';base64,' in key:
                b64 = key.split(';base64,', 1)[1]
                im = Image.open(io.BytesIO(base64.b64decode(b64))).convert('RGBA')
            else:
                disk = self._resolve_disk_media(key)
                if disk and os.path.exists(disk):
                    im = Image.open(disk).convert('RGBA')
                elif key.startswith('http') or key.startswith('assets/') or key.startswith('user_media/'):
                    url = key if key.startswith('http') else f'{self.base_url}/{key.lstrip("/")}'
                    with urllib.request.urlopen(url, timeout=3.0) as resp:
                        im = Image.open(io.BytesIO(resp.read())).convert('RGBA')
        except Exception:
            im = None
        if im is not None:
            im.thumbnail((512, 288), Image.Resampling.LANCZOS)
            im = im.filter(ImageFilter.GaussianBlur(radius=5))
            raw = im.tobytes('raw', 'RGBA')
            fmt = QImage.Format.Format_RGBA8888
            qimg = QImage(raw, im.width, im.height, im.width * 4, fmt).copy()
            self._wp_pixmap = QPixmap.fromImage(qimg)
        else:
            self._wp_pixmap = None

    def _load_sticker_visual(self, sticker_url, w=88, h=28):
        key = f'{sticker_url}|{w}x{h}'
        if key == self._loaded_sticker_key:
            return
        self._loaded_sticker_key = key
        self._sticker_size = (max(36, min(140, int(w))), max(16, min(48, int(h))))
        sw, sh = self._sticker_size
        raw_str = str(sticker_url or '').strip()
        if not raw_str:
            self.sticker_label.hide()
            return
        svg_bytes = None
        try:
            if raw_str.startswith('data:image/svg+xml,'):
                svg_bytes = urllib.parse.unquote(raw_str[len('data:image/svg+xml,'):]).encode('utf-8')
            elif raw_str.startswith('data:image/svg+xml;base64,'):
                svg_bytes = base64.b64decode(raw_str[len('data:image/svg+xml;base64,'):])
            else:
                disk = self._resolve_disk_media(raw_str)
                if disk and os.path.exists(disk):
                    svg_bytes = open(disk, 'rb').read()
        except Exception:
            svg_bytes = None

        if svg_bytes:
            renderer = QSvgRenderer(QByteArray(svg_bytes))
            if renderer.isValid():
                pm = QPixmap(sw * 2, sh * 2)
                pm.fill(Qt.GlobalColor.transparent if QT_VER == 6 else Qt.transparent)
                pt = QPainter(pm)
                renderer.render(pt)
                pt.end()
                pm.setDevicePixelRatio(2.0)
                self.sticker_label.setPixmap(pm)
                self.sticker_label.resize(sw, sh)
                self._sync_sticker_geometry()
                return
        self.sticker_label.hide()

    def _sync_sticker_geometry(self):
        if not self._chat_open or self.chat_card.isHidden() or not self.sticker_label.pixmap() or self.sticker_label.pixmap().isNull():
            self.sticker_label.hide()
            return
        if self.layout():
            self.layout().activate()
        sw, sh = self._sticker_size
        top_off = int(self.theme_state.get('stickerTop', -14))
        right_off = int(self.theme_state.get('stickerRight', 14))
        cg = self.chat_card.geometry()
        sx = cg.right() - sw - right_off
        sy = cg.top() + max(-12, top_off)
        self.sticker_label.move(sx, sy)
        self.sticker_label.show()
        self.sticker_label.raise_()

    def _resolve_disk_media(self, rel_or_url):
        s = str(rel_or_url or '').strip()
        if not s:
            return ''
        if s.startswith(self.base_url + '/'):
            s = s[len(self.base_url) + 1:]
        s = s.lstrip('/')
        if s.startswith('assets/'):
            p = os.path.join(self.root_dir, 'themes', s.replace('/', os.sep))
            if os.path.exists(p):
                return p
        if s.startswith('user_media/'):
            p = os.path.join(self.root_dir, 'themes', s.replace('/', os.sep))
            if os.path.exists(p):
                return p
        return ''

    def _load_sprite_sheet(self, sprite_rel):
        key = str(sprite_rel or 'assets/pets/pet_wlop.webp').strip()
        if key == self._loaded_sprite_key and self._frames_cache:
            return
        disk_path = self._resolve_disk_media(key)
        im = None
        try:
            if disk_path and os.path.exists(disk_path):
                im = Image.open(disk_path).convert('RGBA')
            elif key.startswith('http') or key.startswith('assets/') or key.startswith('user_media/'):
                url = key if key.startswith('http') else f'{self.base_url}/{key.lstrip("/")}'
                with urllib.request.urlopen(url, timeout=3.0) as resp:
                    import io
                    im = Image.open(io.BytesIO(resp.read())).convert('RGBA')
        except Exception:
            im = None
        if im is None:
            fb = os.path.join(self.root_dir, 'themes', 'assets', 'pets', 'pet_wlop.webp')
            if os.path.exists(fb):
                im = Image.open(fb).convert('RGBA')
        if im is None:
            return

        w, h = im.size
        cw = w // COLS
        ch = h // ROWS
        cache = {}
        for r in range(ROWS):
            for c in range(COLS):
                crop = im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
                raw_bytes = crop.tobytes('raw', 'RGBA')
                if QT_VER == 6:
                    fmt = QImage.Format.Format_RGBA8888
                else:
                    fmt = QImage.Format_RGBA8888
                qimg = QImage(raw_bytes, cw, ch, cw * 4, fmt).copy()
                cache[(r, c)] = QPixmap.fromImage(qimg)
        self._frames_cache = cache
        self._loaded_sprite_key = key
        first_pm = cache.get((0, 0))
        if first_pm:
            self.pet_widget.set_frame_pixmap(first_pm)

    def _get_pet_offset_in_window(self):
        if self.layout():
            self.layout().activate()
        g = self.pet_widget.geometry()
        return g.x(), g.y()

    def _move_pet_to_screen_pos(self, sx, sy):
        ox, oy = self._get_pet_offset_in_window()
        target = self._clamp_pos(QPoint(int(sx) - ox, int(sy) - oy))
        self.move(target)
        self._pos_x, self._pos_y = target.x(), target.y()
        self._sync_sticker_geometry()

    def _place_initial(self):
        saved = self.theme_state.get('desktopOverlayPos')
        screen = QGuiApplication.primaryScreen()
        geo = screen.availableGeometry() if screen else QRect(0, 0, 1920, 1040)
        self.adjustSize()
        if isinstance(saved, dict) and isinstance(saved.get('x'), (int, float)) and isinstance(saved.get('y'), (int, float)):
            self._last_synced_pet_pos = (int(saved['x']), int(saved['y']))
            self._move_pet_to_screen_pos(saved['x'], saved['y'])
            return
        x = geo.right() - self.width() - 28
        y = geo.bottom() - self.height() - 24
        clamped = self._clamp_pos(QPoint(x, y))
        self.move(clamped)
        self._pos_x, self._pos_y = clamped.x(), clamped.y()

    def _clamp_pos(self, pt):
        screens = QGuiApplication.screens() or [QGuiApplication.primaryScreen()]
        target_geo = None
        for scr in screens:
            if scr and scr.geometry().contains(pt + QPoint(self.width() // 2, self.height() // 2)):
                target_geo = scr.availableGeometry()
                break
        if target_geo is None:
            scr = QGuiApplication.primaryScreen()
            target_geo = scr.availableGeometry() if scr else QRect(0, 0, 1920, 1040)
        nx = max(target_geo.left() + 6, min(pt.x(), target_geo.right() - self.width() - 6))
        ny = max(target_geo.top() + 6, min(pt.y(), target_geo.bottom() - self.height() - 6))
        return QPoint(nx, ny)

    def _on_drag_move(self, target_pt):
        self._user_moved = True
        if self._drag_last_x is not None:
            dx = target_pt.x() - self._drag_last_x
            if abs(dx) >= 3:
                self._reaction_state = 'running-right' if dx > 0 else 'running-left'
                self._reaction_until = time.time() + 0.35
        self._drag_last_x = target_pt.x()
        clamped = self._clamp_pos(target_pt)
        self.move(clamped)
        self._pos_x, self._pos_y = clamped.x(), clamped.y()

    def _on_drag_end(self, pt):
        self._drag_last_x = None
        clamped = self._clamp_pos(pt)
        self.move(clamped)
        self._pos_x, self._pos_y = clamped.x(), clamped.y()
        self._sync_sticker_geometry()
        ox, oy = self._get_pet_offset_in_window()
        pet_sx = clamped.x() + ox
        pet_sy = clamped.y() + oy
        self._last_synced_pet_pos = (pet_sx, pet_sy)
        self.poller.post_action('/api/overlay/set-config', {
            'desktopOverlayPos': {'x': pet_sx, 'y': pet_sy}
        })

    def _toggle_chat(self):
        self._chat_open = not self._chat_open
        if QT_VER == 6:
            no_act = Qt.WidgetAttribute.WA_ShowWithoutActivating
        else:
            no_act = Qt.WA_ShowWithoutActivating

        old_bottom = self.y() + self.height()
        if self._chat_open:
            self.setAttribute(no_act, False)
            self._reply_hide_timer.stop()
            self.chat_card.show()
            if self.theme_state.get('latestReply'):
                self.reply_card.show()
            self._reaction_state = 'waving'
            self._reaction_until = time.time() + 1.4
        else:
            self.chat_card.hide()
            if self.reply_card.isVisible():
                self._reply_hide_timer.start(4500)
            self.setAttribute(no_act, True)

        self.adjustSize()
        self._sync_sticker_geometry()
        # Keep anchor stable while keeping chat card comfortably on screen
        new_pt = self._clamp_pos(QPoint(self.x(), max(8, old_bottom - self.height() if self._chat_open else self.y())))
        self.move(new_pt)
        self._sync_sticker_geometry()
        if self._chat_open:
            self.activateWindow()
            self.raise_()
            self.chat_input.setFocus()
            QTimer.singleShot(15, self._sync_sticker_geometry)

    def _auto_hide_reply_card(self):
        if self._chat_open:
            return
        if self.reply_card.isVisible():
            self.reply_card.hide()
            self.adjustSize()

    def _dismiss_reply_card(self):
        self._reply_hide_timer.stop()
        self._reply_dismissed_seq = str(self.theme_state.get('replySeq') or '')
        self.reply_card.hide()
        self.adjustSize()

    def _submit_chat(self):
        text = self.chat_input.toPlainText().strip()
        if not text:
            return
        self.chat_input.clear()
        self.send_btn.setEnabled(False)
        self.send_btn.setText('…')
        self._last_sending_at = time.time()
        self._reaction_state = 'running'
        self._reaction_until = time.time() + 3.5
        self._refresh_pill()
        self.poller.send_chat(text)

    def _on_chat_result(self, ok, err):
        self.send_btn.setEnabled(True)
        self.send_btn.setText('↑')
        if ok:
            self.chat_hint.setText('✓ Đã gửi vào Antigravity')
            QTimer.singleShot(2800, lambda: self.chat_hint.setText(self._workspace_hint()))
        else:
            self.chat_hint.setText(f'⚠️ {err[:36] or "Lỗi gửi"}')

    def _workspace_hint(self):
        model = str(self.theme_state.get('modelLabel') or '').strip()
        perm = str(self.theme_state.get('permLabel') or '').strip()
        if model:
            short_m = model.replace('High', '').replace('Medium', '').strip()[:20]
            return f'✦ {short_m} · {perm}' if perm else f'✦ {short_m}'
        title = str(self.theme_state.get('pageTitle') or 'Antigravity').split(' - ')[0].strip()
        return f'→ {title[:26]}' if title else 'Antigravity Bridge'

    def _restore_antigravity(self):
        self.poller.post_action('/api/overlay/focus-app', {})

    def _speak_pet_voice(self):
        voices = self.theme_state.get('petVoices') or []
        if not voices:
            return
        clip = random.choice(voices)
        disk_p = self._resolve_disk_media(clip.get('url') if isinstance(clip, dict) else '')
        if disk_p:
            self._reaction_state = 'jumping'
            self._reaction_until = time.time() + 1.8
            play_mp3_native(disk_p, self.theme_state.get('taskVoiceVol', 85))

    def _set_overlay_mode(self, mode):
        self.theme_state['desktopOverlayMode'] = mode
        self.poller.post_action('/api/overlay/set-config', {'desktopOverlayMode': mode})
        self._tick_visibility()

    def _show_context_menu(self, gpos):
        pet_nm = str(self.theme_state.get('petName') or 'Pet')
        mode = str(self.theme_state.get('desktopOverlayMode') or 'auto')
        menu = QMenu(self)
        menu.setStyleSheet("""
            QMenu {
                background: rgba(12, 16, 28, 246);
                color: #f8fafc;
                border: 1px solid rgba(255, 255, 255, 45);
                border-radius: 10px;
                padding: 5px;
                font-size: 12px;
            }
            QMenu::item {
                padding: 6px 14px;
                border-radius: 6px;
            }
            QMenu::item:selected {
                background: rgba(255, 255, 255, 34);
            }
        """)
        act_chat = menu.addAction('🔽 Đóng khung chat' if self._chat_open else '💬 Mở khung chat')
        act_speak = menu.addAction(f'🔊 Nghe {pet_nm} nói')
        act_open_app = menu.addAction('🚀 Hiện cửa sổ Antigravity')
        menu.addSeparator()
        act_auto = menu.addAction('✓ Tự hiện khi Antigravity chìm' if mode == 'auto' else '🖥️ Tự hiện khi Antigravity chìm')
        act_always = menu.addAction('✓ Luôn hiện trên mọi cửa sổ' if mode == 'always' else '📌 Luôn hiện trên mọi cửa sổ')
        act_off = menu.addAction('🙈 Tắt Desktop Overlay')

        chosen = menu.exec(gpos)
        if chosen == act_chat:
            self._toggle_chat()
        elif chosen == act_speak:
            self._speak_pet_voice()
        elif chosen == act_open_app:
            self._restore_antigravity()
        elif chosen == act_auto:
            self._set_overlay_mode('auto')
        elif chosen == act_always:
            self._set_overlay_mode('always')
        elif chosen == act_off:
            self._set_overlay_mode('off')

    def _on_state_updated(self, data):
        prev_colors = self.theme_state.get('colors')
        prev_sprite = self.theme_state.get('petSpriteUrl')
        prev_wp = self.theme_state.get('wallpaperUrl')
        prev_sticker = self.theme_state.get('sticker')
        prev_state = self._prev_agent_state
        prev_reply_seq = str(self.theme_state.get('replySeq') or '')
        self.theme_state.update(data)

        if data.get('petSpriteUrl') and data.get('petSpriteUrl') != prev_sprite:
            self._load_sprite_sheet(data.get('petSpriteUrl'))
        if data.get('wallpaperUrl') != prev_wp:
            self._load_wallpaper_visual(data.get('wallpaperUrl'))
        if data.get('sticker') != prev_sticker:
            self._load_sticker_visual(data.get('sticker'), data.get('stickerW', 88), data.get('stickerH', 28))
        if data.get('colors') != prev_colors or data.get('wallpaperUrl') != prev_wp:
            self._apply_styles()

        ov_pos = data.get('desktopOverlayPos')
        if (
            self._drag_last_x is None
            and isinstance(ov_pos, dict)
            and isinstance(ov_pos.get('x'), (int, float))
            and isinstance(ov_pos.get('y'), (int, float))
        ):
            pos_tuple = (int(ov_pos['x']), int(ov_pos['y']))
            if pos_tuple != self._last_synced_pet_pos:
                self._last_synced_pet_pos = pos_tuple
                self._move_pet_to_screen_pos(pos_tuple[0], pos_tuple[1])

        cur_state = str(data.get('agentState') or 'idle')
        cur_reply = str(data.get('latestReply') or '').strip()
        cur_seq = str(data.get('replySeq') or '')

        if cur_state != prev_state:
            if prev_state == 'running' and cur_state in ('ready', 'idle'):
                self._reaction_state = 'jumping'
                self._reaction_until = time.time() + 2.2
                if self.isVisible() and self.theme_state.get('syncPetVoice', True) and self.theme_state.get('taskVoiceEnabled', True):
                    self._speak_pet_voice()
            self._prev_agent_state = cur_state

        if cur_reply and cur_seq != prev_reply_seq and cur_seq != self._reply_dismissed_seq:
            self.reply_title.setText(f"{self.theme_state.get('petName', 'Pet')} · Trả lời mới")
            self.reply_body.setText(cur_reply)
            if self.isVisible() and (self._chat_open or prev_state == 'running'):
                self.reply_card.show()
                self.adjustSize()
                self.move(self._clamp_pos(self.pos()))
                if not self._chat_open:
                    self._reply_hide_timer.start(6000)

        if not self.chat_hint.text().startswith('✓') and not self.chat_hint.text().startswith('⚠'):
            self.chat_hint.setText(self._workspace_hint())
        self._refresh_pill()

    def _refresh_pill(self):
        pet_nm = str(self.theme_state.get('petName') or 'Companion')
        st = str(self.theme_state.get('agentState') or 'idle')
        if time.time() - self._last_sending_at < 1.5:
            lbl = 'Sending…'
        elif st == 'running':
            lbl = 'Thinking…'
        elif st == 'waiting':
            lbl = 'Needs input'
        elif st == 'failed':
            lbl = 'Error'
        elif st == 'ready':
            lbl = 'Ready'
        else:
            lbl = 'Idle'
        self.status_pill.setText(f'{pet_nm} · {lbl}')

    def _set_overlay_visible(self, visible):
        if visible:
            if not self.isVisible():
                self.show()
                self.raise_()
        else:
            if self.isVisible():
                self.hide()
        if self._last_reported_vis is not visible:
            self._last_reported_vis = visible
            self.poller.post_action('/api/overlay/visibility', {'visible': visible})

    def _tick_visibility(self):
        mode = str(self.theme_state.get('desktopOverlayMode') or 'auto')
        enabled = self.theme_state.get('petEnabled', True) is not False
        if not enabled or mode == 'off':
            self._set_overlay_visible(False)
            return

        if mode == 'always':
            self._set_overlay_visible(True)
            return

        # Auto mode: show only when Antigravity is minimized or occluded by another non-taskbar window
        should_show = check_overlay_should_show(self.own_pid, self.isVisible()) if IS_WIN else False
        self._set_overlay_visible(should_show)

    def _tick_animation(self):
        if not self.isVisible() or not self._frames_cache:
            return
        now = time.time()
        st = str(self.theme_state.get('agentState') or 'idle')
        state_key = self._reaction_state if (self._reaction_state and now < self._reaction_until) else st
        if state_key == 'ready':
            state_key = 'idle'

        # Cursor tracking in calm states
        if state_key in LOOK_STATES and not self._chat_open:
            cur = QCursor.pos()
            center = self.pet_widget.mapToGlobal(QPoint(DISPLAY_W // 2, DISPLAY_H // 2))
            dx = cur.x() - center.x()
            dy = cur.y() - center.y()
            dist = math.hypot(dx, dy)
            if 10 <= dist <= 260:
                deg = (math.degrees(math.atan2(dx, -dy)) + 360.0) % 360.0
                sector = int(round(deg / 22.5)) % 16
                r = 9 + (sector // COLS)
                c = sector % COLS
                pm = self._frames_cache.get((r, c))
                if pm:
                    self.pet_widget.set_frame_pixmap(pm)
                    return

        seq = ROW_ANIM.get(state_key) or ROW_ANIM['idle']
        self._frame_idx = (self._frame_idx + 1) % len(seq)
        r, c, _, _ = seq[self._frame_idx]
        pm = self._frames_cache.get((r, c)) or self._frames_cache.get((0, 0))
        if pm:
            self.pet_widget.set_frame_pixmap(pm)


def acquire_pid_lock(pid_file):
    if os.path.exists(pid_file):
        try:
            old_pid = int(open(pid_file, 'r', encoding='utf-8').read().strip())
            if old_pid and old_pid != os.getpid():
                if IS_WIN:
                    # Check if alive and replace cleanly
                    try:
                        os.kill(old_pid, signal.SIGTERM)
                        time.sleep(0.25)
                    except OSError:
                        pass
        except Exception:
            pass
    with open(pid_file, 'w', encoding='utf-8') as f:
        f.write(str(os.getpid()))


def remove_pid_lock(pid_file):
    try:
        if os.path.exists(pid_file):
            cur = int(open(pid_file, 'r', encoding='utf-8').read().strip() or '0')
            if cur == os.getpid():
                os.unlink(pid_file)
    except Exception:
        pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default=os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    parser.add_argument('--media-port', type=int, default=47821)
    args = parser.parse_args()

    pid_file = os.path.join(args.root, 'overlay.pid')
    acquire_pid_lock(pid_file)

    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(False)
    win = DesktopPetOverlay(args.root, args.media_port)

    def _cleanup(*_):
        win.poller.stop()
        remove_pid_lock(pid_file)
        app.quit()

    signal.signal(signal.SIGINT, _cleanup)
    signal.signal(signal.SIGTERM, _cleanup)

    # Periodic signal pump for Ctrl+C / SIGTERM in Qt
    pump = QTimer()
    pump.timeout.connect(lambda: None)
    pump.start(400)

    rc = app.exec()
    _cleanup()
    sys.exit(rc)


if __name__ == '__main__':
    main()
