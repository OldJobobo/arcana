import QtQuick
import qs.Commons

Rectangle {
  id: root

  property string text: ""
  property bool selected: false
  property bool compact: false
  property bool danger: false
  property bool outlined: true
  property bool systemTheme: false
  property color accent: danger
    ? (systemTheme ? Color.urgent : "#d97743")
    : (systemTheme ? Color.accent : "#62d6df")
  property color foreground: systemTheme ? Color.foreground : "#c7ccca"
  property color quietBorder: systemTheme ? Color.popups.border : Qt.rgba(0.52,0.62,0.64,0.38)
  signal clicked()

  implicitWidth: Math.max(compact ? 76 : 118, label.implicitWidth + (compact ? 20 : 30))
  implicitHeight: compact ? 31 : 38
  radius: 3
  color: selected
    ? Qt.rgba(accent.r,accent.g,accent.b,0.16)
    : (mouse.containsMouse || activeFocus ? Qt.rgba(accent.r,accent.g,accent.b,0.09) : "transparent")
  border.width: outlined || selected || activeFocus ? 1 : 0
  border.color: selected || activeFocus ? accent : quietBorder
  activeFocusOnTab: true

  Behavior on color { ColorAnimation { duration: 90 } }
  Behavior on accent { ColorAnimation { duration: 120 } }
  Behavior on foreground { ColorAnimation { duration: 120 } }
  Behavior on quietBorder { ColorAnimation { duration: 120 } }

  Text {
    id: label
    anchors.centerIn: parent
    text: root.text
    color: root.selected || mouse.containsMouse || root.activeFocus ? root.accent : root.foreground
    font.family: "monospace"
    font.pixelSize: root.compact ? 10 : 11
    font.bold: true
    font.letterSpacing: 0.8
    textFormat: Text.PlainText
    Behavior on color { ColorAnimation { duration: 90 } }
  }

  Keys.onReturnPressed: root.clicked()
  Keys.onEnterPressed: root.clicked()
  Keys.onSpacePressed: root.clicked()

  MouseArea {
    id: mouse
    anchors.fill: parent
    hoverEnabled: true
    cursorShape: Qt.PointingHandCursor
    onClicked: {
      root.forceActiveFocus()
      root.clicked()
    }
  }
}
