import QtQuick

Item {
  id: root

  property var cardData: null
  property bool showBack: false
  property bool reversed: false
  property color backgroundColor: "#07090b"
  property color frameColor: "#273139"
  property color artFrameColor: "#36434b"
  property color inkColor: "#e4e0d6"
  property color mutedColor: "#899a9c"
  property color primaryColor: "#469bff"
  property color secondaryColor: "#71d4e6"
  property color faultColor: "#f15b4a"

  readonly property real unit: width / 600
  readonly property bool compact: width < 260
  readonly property int detailPixelSize: root.compact ? 9 : Math.max(12, Math.round(14 * root.unit))
  readonly property int systemPixelSize: root.compact ? 10 : Math.max(13, Math.round(15 * root.unit))
  readonly property int microPixelSize: Math.max(9, Math.round(10 * root.unit))
  readonly property string artworkFilename: {
    if (root.showBack) return "card-back.png"
    if (!root.cardData || !root.cardData.image) return ""
    var parts = String(root.cardData.image).split("/")
    return parts[parts.length - 1]
  }
  readonly property string rankLabel: rankFor(root.cardData)
  readonly property string domainLabel: domainFor(root.cardData)
  readonly property string displayDomainLabel: {
    var card = root.cardData
    if (!card) return ""
    return card.arcana === "major" ? "MAJOR ARCANA" : root.domainLabel
  }
  readonly property string coordinateLabel: coordinateFor(root.cardData)
  readonly property string keywordLabel: keywordsFor(root.cardData)

  implicitWidth: 196
  implicitHeight: Math.round(width * 1.75)
  height: Math.round(width * 1.75)
  clip: true

  function rankFor(card) {
    if (!card) return ""
    var roman = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"]
    var minor = ({ace:"A", two:"II", three:"III", four:"IV", five:"V", six:"VI", seven:"VII", eight:"VIII", nine:"IX", ten:"X", page:"P", knight:"N", queen:"Q", king:"K"})
    return card.arcana === "major" ? roman[Number(card.rank)] : (minor[String(card.rank)] || String(card.rank).toUpperCase())
  }

  function domainFor(card) {
    if (!card) return ""
    if (card.arcana === "major") return "MAJOR ARCANA / ARCHETYPAL SYSTEM"
    return String(card.suit).toUpperCase() + " / " + String(card.omarchy.domain).toUpperCase()
  }

  function coordinateFor(card) {
    if (!card) return ""
    if (card.arcana === "major") return "MA." + String(Number(card.rank)).padStart(2, "0")
    var order = ({ace:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, page:11, knight:12, queen:13, king:14})
    var codes = ({wands:"WD", cups:"CP", swords:"SW", pentacles:"PT"})
    return (codes[String(card.suit)] || "??") + "." + String(order[String(card.rank)] || 0).padStart(2, "0")
  }

  function keywordsFor(card) {
    if (!card || !card.traditional || !card.traditional.uprightKeywords) return ""
    return card.traditional.uprightKeywords.slice(0, 3).join(" / ").toUpperCase()
  }

  Rectangle {
    anchors.fill: parent
    color: root.backgroundColor
    border.width: Math.max(1, Math.round(2 * root.unit))
    border.color: root.frameColor
  }

  ThemeCardImage {
    anchors.fill: parent
    visible: root.showBack
    source: Qt.resolvedUrl("../assets/card-art/card-back.png")
    primaryMaskSource: Qt.resolvedUrl("../assets/card-art-masks/primary/card-back.png")
    secondaryMaskSource: Qt.resolvedUrl("../assets/card-art-masks/secondary/card-back.png")
    faultMaskSource: Qt.resolvedUrl("../assets/card-art-masks/fault/card-back.png")
    primaryColor: root.primaryColor
    secondaryColor: root.secondaryColor
    faultColor: root.faultColor
  }

  Item {
    anchors.fill: parent
    visible: !root.showBack

    Rectangle {
      x: Math.round(14 * root.unit)
      y: Math.round(14 * root.unit)
      width: Math.max(2, Math.round(5 * root.unit))
      height: Math.round(1022 * root.unit)
      color: root.primaryColor
    }

    Item {
      id: header
      x: Math.round(31 * root.unit)
      y: Math.round(27 * root.unit)
      width: Math.round(538 * root.unit)
      height: Math.round(54 * root.unit)

      Text {
        id: rankText
        anchors.left: parent.left
        anchors.top: parent.top
        text: root.rankLabel
        color: root.inkColor
        font.family: "sans-serif"
        font.bold: true
        font.pixelSize: root.compact ? 14 : Math.max(18, Math.round(36 * root.unit))
        textFormat: Text.PlainText
      }

      Text {
        anchors.left: rankText.right
        anchors.leftMargin: root.compact ? 8 : Math.round(24 * root.unit)
        anchors.right: coordinateText.visible ? coordinateText.left : parent.right
        anchors.rightMargin: root.compact ? 0 : Math.round(12 * root.unit)
        anchors.top: parent.top
        anchors.topMargin: root.compact ? 2 : Math.round(4 * root.unit)
        text: root.displayDomainLabel
        color: root.primaryColor
        font.family: "monospace"
        font.bold: true
        font.pixelSize: root.detailPixelSize
        font.letterSpacing: root.compact ? 0.15 : Math.max(0.4, 0.6 * root.unit)
        elide: Text.ElideRight
        textFormat: Text.PlainText
      }

      Text {
        id: coordinateText
        visible: !root.compact
        anchors.right: parent.right
        anchors.top: parent.top
        anchors.topMargin: Math.round(6 * root.unit)
        text: root.coordinateLabel
        color: root.mutedColor
        font.family: "monospace"
        font.pixelSize: root.detailPixelSize
        textFormat: Text.PlainText
      }

      Text {
        visible: !root.compact
        anchors.left: rankText.right
        anchors.leftMargin: Math.round(24 * root.unit)
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        text: root.keywordLabel
        color: root.mutedColor
        font.family: "monospace"
        font.pixelSize: root.detailPixelSize
        font.letterSpacing: Math.max(0.2, 0.35 * root.unit)
        elide: Text.ElideRight
        textFormat: Text.PlainText
      }
    }

    Rectangle {
      x: Math.round(31 * root.unit)
      y: Math.round(77 * root.unit)
      width: Math.round(538 * root.unit)
      height: Math.max(1, Math.round(3 * root.unit))
      color: root.primaryColor
    }

    Rectangle {
      x: Math.round(31 * root.unit)
      y: Math.round(94 * root.unit)
      width: Math.round(538 * root.unit)
      height: Math.round(788 * root.unit)
      color: "transparent"
      border.width: Math.max(1, Math.round(2 * root.unit))
      border.color: root.artFrameColor
    }

    Item {
      id: artViewport
      x: Math.round(32 * root.unit)
      y: Math.round(95 * root.unit)
      width: Math.round(536 * root.unit)
      height: Math.round(786 * root.unit)
      clip: true

      ThemeCardImage {
        anchors.fill: parent
        source: root.artworkFilename ? Qt.resolvedUrl("../assets/card-art/" + root.artworkFilename) : ""
        primaryMaskSource: root.artworkFilename ? Qt.resolvedUrl("../assets/card-art-masks/primary/" + root.artworkFilename) : ""
        secondaryMaskSource: root.artworkFilename ? Qt.resolvedUrl("../assets/card-art-masks/secondary/" + root.artworkFilename) : ""
        faultMaskSource: root.artworkFilename ? Qt.resolvedUrl("../assets/card-art-masks/fault/" + root.artworkFilename) : ""
        primaryColor: root.primaryColor
        secondaryColor: root.secondaryColor
        faultColor: root.faultColor
        rotation: root.reversed ? 180 : 0
      }
    }

    Rectangle {
      x: Math.round(31 * root.unit)
      y: Math.round((root.compact ? 888 : 895) * root.unit)
      width: Math.round(538 * root.unit)
      height: Math.max(1, Math.round(2 * root.unit))
      color: root.artFrameColor
    }

    Text {
      x: Math.round(31 * root.unit)
      y: Math.round((root.compact ? 900 : 912) * root.unit)
      width: Math.round(538 * root.unit)
      height: Math.round((root.compact ? 56 : 43) * root.unit)
      text: root.cardData ? String(root.cardData.title).toUpperCase() : ""
      color: root.inkColor
      font.family: "sans-serif"
      font.bold: true
      font.pixelSize: root.compact ? 15 : Math.max(20, Math.round(38 * root.unit))
      fontSizeMode: Text.Fit
      minimumPixelSize: root.compact ? 11 : 16
      verticalAlignment: Text.AlignVCenter
      elide: Text.ElideRight
      textFormat: Text.PlainText
    }

    Text {
      x: Math.round(32 * root.unit)
      y: Math.round((root.compact ? 962 : 958) * root.unit)
      width: Math.round(536 * root.unit)
      text: root.cardData ? String(root.cardData.systemTitle).toUpperCase() : ""
      color: root.primaryColor
      font.family: "monospace"
      font.bold: true
      font.pixelSize: root.systemPixelSize
      font.letterSpacing: root.compact ? 0.2 : Math.max(0.5, 0.8 * root.unit)
      elide: Text.ElideRight
      textFormat: Text.PlainText
    }

    Row {
      x: Math.round(31 * root.unit)
      y: Math.round((root.compact ? 1014 : 994) * root.unit)
      spacing: Math.max(3, Math.round(6 * root.unit))
      Rectangle { width: Math.round(105 * root.unit); height: Math.max(1, Math.round(2 * root.unit)); color: root.primaryColor }
      Rectangle { width: Math.round(19 * root.unit); height: Math.max(1, Math.round(2 * root.unit)); color: root.secondaryColor }
      Rectangle { width: Math.max(2, Math.round(4 * root.unit)); height: width; radius: width / 2; color: root.inkColor }
    }

    Text {
      visible: !root.compact
      x: Math.round(31 * root.unit)
      y: Math.round(1010 * root.unit)
      width: Math.round(538 * root.unit)
      text: "SOVEREIGN DESKTOP  /  ORDER SURROUNDING MYSTERY"
      color: root.mutedColor
      font.family: "monospace"
      font.pixelSize: root.microPixelSize
      font.letterSpacing: Math.max(0.15, 0.3 * root.unit)
      elide: Text.ElideRight
      textFormat: Text.PlainText
    }
  }
}
