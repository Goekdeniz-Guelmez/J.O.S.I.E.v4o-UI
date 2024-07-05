import sys
import threading
import time
from PyQt5.QtWidgets import QApplication, QWidget, QVBoxLayout
from PyQt5.QtGui import QPainter, QColor, QRadialGradient
from PyQt5.QtCore import Qt, QPropertyAnimation, QEasingCurve, pyqtProperty
import whisper
import ollama
import pyttsx3

class AnimatedCircle(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self._radius = 100
        self._blur = 20

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)

        gradient = QRadialGradient(self.width() / 2, self.height() / 2, self._radius)
        gradient.setColorAt(0, QColor(245, 245, 245, 200))
        gradient.setColorAt(1, QColor(245, 245, 245, 0))

        painter.setBrush(gradient)
        painter.setPen(Qt.NoPen)
        painter.drawEllipse(self.width() / 2 - self._radius, self.height() / 2 - self._radius,
                            self._radius * 2, self._radius * 2)

    @pyqtProperty(int)
    def radius(self):
        return self._radius

    @radius.setter
    def radius(self, value):
        self._radius = value
        self.update()

    @pyqtProperty(int)
    def blur(self):
        return self._blur

    @blur.setter
    def blur(self, value):
        self._blur = value
        self.update()

class VoiceInteractionUI(QWidget):
    def __init__(self):
        super().__init__()
        self.initUI()
        self.whisper_model = whisper.load_model("base")
        self.tts_engine = pyttsx3.init()
        self.is_assistant_speaking = False

    def initUI(self):
        self.setGeometry(100, 100, 400, 400)
        self.setWindowTitle('Voice Interaction UI')
        self.setStyleSheet("background-color: #121212;")

        layout = QVBoxLayout()
        self.circle = AnimatedCircle()
        layout.addWidget(self.circle)
        self.setLayout(layout)

        self.animation = QPropertyAnimation(self.circle, b"radius")
        self.animation.setDuration(1500)
        self.animation.setStartValue(100)
        self.animation.setEndValue(120)
        self.animation.setEasingCurve(QEasingCurve.InOutQuad)

        self.blur_animation = QPropertyAnimation(self.circle, b"blur")
        self.blur_animation.setDuration(1500)
        self.blur_animation.setStartValue(20)
        self.blur_animation.setEndValue(40)
        self.blur_animation.setEasingCurve(QEasingCurve.InOutQuad)

    def start_animations(self):
        self.animation.setDirection(QPropertyAnimation.Forward)
        self.blur_animation.setDirection(QPropertyAnimation.Forward)
        self.animation.start()
        self.blur_animation.start()

    def stop_animations(self):
        self.animation.setDirection(QPropertyAnimation.Backward)
        self.blur_animation.setDirection(QPropertyAnimation.Backward)
        self.animation.start()
        self.blur_animation.start()

    def process_audio(self):
        while True:
            print("Listening...")
            # Here you would capture audio. For simplicity, we'll use input()
            user_input = input("Speak (type for simulation): ")
            
            # Convert speech to text (simulated)
            text = user_input  # In real scenario: self.whisper_model.transcribe(audio)["text"]
            print(f"You said: {text}")

            # Process with Ollama
            response = ollama.chat(model='gemma:2b', messages=[{'role': 'user', 'content': text}])
            assistant_response = response['message']['content']
            print(f"Assistant: {assistant_response}")

            # Text to speech
            self.is_assistant_speaking = True
            self.start_animations()
            self.tts_engine.say(assistant_response)
            self.tts_engine.runAndWait()
            self.is_assistant_speaking = False
            self.stop_animations()

def main():
    app = QApplication(sys.argv)
    ui = VoiceInteractionUI()
    ui.show()

    # Start processing in a separate thread
    threading.Thread(target=ui.process_audio, daemon=True).start()

    sys.exit(app.exec_())

if __name__ == '__main__':
    main()