import QtQuick
import qs.Commons
import qs.Ui

BarWidget {
  id: root
  moduleName: "org.ministryoftaste.arcana"

  readonly property var arcana: root.bar && root.bar.shell
    ? root.bar.shell.serviceFor(root.moduleName)
    : null
  readonly property var reading: arcana ? arcana.currentReading : null
  readonly property string firstTitle: reading && reading.cards && reading.cards.length
    ? reading.cards[0].card.title : ""

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  WidgetButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    labelVisible: false
    hasVisualContent: true
    tooltipText: root.firstTitle !== "" ? "Arcana · " + root.firstTitle : "Arcana"
    fixedWidth: root.vertical ? -1 : Style.bar.sizeHorizontal
    fixedHeight: root.vertical ? Style.bar.sizeVertical : -1

    onPressed: function(mouseButton) {
      if (mouseButton === Qt.LeftButton && root.bar)
        root.bar.run("omarchy-shell shell toggle org.ministryoftaste.arcana '{}'")
      else if (mouseButton === Qt.MiddleButton && root.arcana)
        root.arcana.requestFree()
    }

    Item {
      anchors.centerIn: parent
      width: 22
      height: 18

      Rectangle {
        anchors.centerIn: parent
        width: 11
        height: 11
        rotation: 45
        color: "transparent"
        border.width: 1
        border.color: "#62d6df"
      }
      Rectangle {
        anchors.verticalCenter: parent.verticalCenter
        x: 1
        width: parent.width - 2
        height: 1
        color: "#62d6df"
        opacity: 0.68
      }
      Rectangle {
        anchors.centerIn: parent
        width: 3
        height: 3
        radius: 2
        color: "#62d6df"
      }
      Rectangle {
        x: parent.width - 3
        y: parent.height - 4
        width: 3
        height: 3
        radius: 2
        color: "#b89b61"
      }
    }
  }
}
