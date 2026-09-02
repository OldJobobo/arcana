import QtQuick

Column {
  id: root

  property var itemData: null
  property real cardWidth: 196
  property real cardHeight: Math.round(cardWidth * 1.75)
  property bool revealed: true
  property bool hovered: hoverArea.containsMouse
  property real flipAngle: revealed ? 180 : 0
  readonly property bool faceVisible: flipAngle >= 90
  signal revealRequested()

  width: cardWidth
  spacing: 6
  activeFocusOnTab: true
  scale: hovered || activeFocus ? 1.055 : 1
  z: hovered || activeFocus ? 4 : 0
  transformOrigin: Item.Center
  transform: Translate { y: root.hovered || root.activeFocus ? -10 : 0 }

  Behavior on scale { NumberAnimation { duration: 180; easing.type: Easing.OutCubic } }

  Keys.onReturnPressed: function(event) { root.requestReveal(); event.accepted = true }
  Keys.onEnterPressed: function(event) { root.requestReveal(); event.accepted = true }
  Keys.onSpacePressed: function(event) { root.requestReveal(); event.accepted = true }

  function requestReveal() {
    if (!revealed) revealRequested()
  }

  Item {
    id: cardStage
    width: root.cardWidth
    height: root.cardHeight

    Rectangle {
      x: root.hovered || root.activeFocus ? 7 : 4
      y: root.hovered || root.activeFocus ? 12 : 7
      width: parent.width
      height: parent.height
      radius: 7
      color: root.hovered || root.activeFocus ? "#8a000000" : "#59000000"

      Behavior on x { NumberAnimation { duration: 180; easing.type: Easing.OutCubic } }
      Behavior on y { NumberAnimation { duration: 180; easing.type: Easing.OutCubic } }
      Behavior on color { ColorAnimation { duration: 180 } }
    }

    Rectangle {
      id: cardPlane
      width: parent.width
      height: parent.height
      radius: 5
      color: "#171b1d"
      border.width: root.activeFocus || root.hovered ? 2 : 1
      border.color: root.activeFocus || root.hovered
        ? "#62d6df"
        : (root.faceVisible && root.itemData && root.itemData.orientation === "reversed" ? "#b89b61" : "#40575a")

      transform: Rotation {
        origin.x: cardPlane.width / 2
        origin.y: cardPlane.height / 2
        axis.x: 0
        axis.y: 1
        axis.z: 0
        angle: root.flipAngle < 90 ? root.flipAngle : root.flipAngle - 180
      }

      Image {
        anchors.fill: parent
        anchors.margins: 3
        source: root.flipAngle < 90
          ? Qt.resolvedUrl("../assets/cards/card-back.png")
          : (root.itemData ? Qt.resolvedUrl("../" + root.itemData.card.image) : "")
        fillMode: Image.PreserveAspectFit
        asynchronous: true
        cache: true
        smooth: true
        mipmap: true
        rotation: root.flipAngle >= 90 && root.itemData && root.itemData.orientation === "reversed" ? 180 : 0
      }

      Rectangle {
        anchors.fill: parent
        anchors.margins: 7
        radius: 3
        color: "transparent"
        border.width: root.activeFocus && !root.revealed ? 1 : 0
        border.color: "#b89b61"
        opacity: 0.7
      }
    }

    MouseArea {
      id: hoverArea
      anchors.fill: parent
      hoverEnabled: true
      cursorShape: root.revealed ? Qt.ArrowCursor : Qt.PointingHandCursor
      onClicked: {
        root.forceActiveFocus()
        root.requestReveal()
      }
    }
  }

  Text {
    width: parent.width
    visible: root.itemData && root.itemData.positionId !== "single"
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
    text: root.faceVisible && root.itemData ? root.itemData.card.title.toUpperCase() : "CLICK / ENTER TO REVEAL"
    color: root.faceVisible ? "#e4e0d6" : "#62d6df"
    font.family: "monospace"
    font.pixelSize: root.faceVisible ? 12 : 9
    font.bold: true
    font.letterSpacing: root.faceVisible ? 0 : 0.8
    horizontalAlignment: Text.AlignHCenter
    elide: Text.ElideRight
    textFormat: Text.PlainText
    Behavior on color { ColorAnimation { duration: 180 } }
  }

  Text {
    width: parent.width
    text: root.faceVisible && root.itemData ? root.itemData.card.systemTitle.toUpperCase() : "ORDER SURROUNDING MYSTERY"
    color: "#b89b61"
    opacity: root.faceVisible ? 1 : 0.62
    font.family: "monospace"
    font.pixelSize: 9
    font.letterSpacing: 0.7
    horizontalAlignment: Text.AlignHCenter
    elide: Text.ElideRight
    textFormat: Text.PlainText
    Behavior on opacity { NumberAnimation { duration: 180 } }
  }

  Text {
    width: parent.width
    text: root.faceVisible && root.itemData ? root.itemData.orientationLabel : "FACE DOWN"
    color: root.faceVisible && root.itemData && root.itemData.orientation === "reversed" ? "#b89b61" : "#899a9c"
    font.family: "monospace"
    font.pixelSize: 9
    horizontalAlignment: Text.AlignHCenter
    elide: Text.ElideRight
    textFormat: Text.PlainText
    Behavior on color { ColorAnimation { duration: 180 } }
  }

  Behavior on flipAngle { NumberAnimation { duration: 420; easing.type: Easing.InOutCubic } }
}
