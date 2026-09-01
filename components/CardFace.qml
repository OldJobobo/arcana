import QtQuick

Column {
  id: root

  property var itemData: null
  property real cardWidth: 196
  property real cardHeight: Math.round(cardWidth * 1.75)

  width: cardWidth
  spacing: 8

  Rectangle {
    width: root.cardWidth
    height: root.cardHeight
    radius: 4
    color: "#171b1d"
    border.width: 1
    border.color: root.itemData && root.itemData.orientation === "reversed" ? "#b89b61" : "#40575a"

    Rectangle {
      anchors.fill: parent
      anchors.margins: -5
      z: -1
      radius: 7
      color: "#56000000"
    }

    Image {
      anchors.fill: parent
      anchors.margins: 3
      source: root.itemData ? Qt.resolvedUrl("../" + root.itemData.card.image) : ""
      fillMode: Image.PreserveAspectFit
      asynchronous: true
      cache: true
      smooth: true
      mipmap: true
      rotation: root.itemData && root.itemData.orientation === "reversed" ? 180 : 0

      Behavior on opacity { NumberAnimation { duration: 140 } }
    }
  }

  Text {
    width: parent.width
    text: root.itemData ? root.itemData.positionLabel.toUpperCase() : ""
    color: "#62d6df"
    font.family: "monospace"
    font.pixelSize: 9
    font.bold: true
    font.letterSpacing: 1.4
    horizontalAlignment: Text.AlignHCenter
    textFormat: Text.PlainText
  }

  Text {
    width: parent.width
    text: root.itemData ? root.itemData.card.title.toUpperCase() : ""
    color: "#e4e0d6"
    font.family: "monospace"
    font.pixelSize: 11
    font.bold: true
    horizontalAlignment: Text.AlignHCenter
    elide: Text.ElideRight
    textFormat: Text.PlainText
  }

  Text {
    width: parent.width
    text: root.itemData ? root.itemData.orientationLabel : ""
    color: "#899a9c"
    font.family: "monospace"
    font.pixelSize: 9
    horizontalAlignment: Text.AlignHCenter
    elide: Text.ElideRight
    textFormat: Text.PlainText
  }
}
