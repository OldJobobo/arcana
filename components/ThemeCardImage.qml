import QtQuick
import Qt5Compat.GraphicalEffects

Item {
  id: root

  property url source: ""
  property url primaryMaskSource: ""
  property url secondaryMaskSource: ""
  property url faultMaskSource: ""
  property color primaryColor: "#469bff"
  property color secondaryColor: "#71d4e6"
  property color faultColor: "#f15b4a"
  property int fillMode: Image.PreserveAspectFit
  property bool asynchronous: true
  property bool cache: true
  property bool smooth: true
  property bool mipmap: true

  Image {
    anchors.fill: parent
    source: root.source
    fillMode: root.fillMode
    asynchronous: root.asynchronous
    cache: root.cache
    smooth: root.smooth
    mipmap: root.mipmap
  }

  Image {
    id: primaryMask
    anchors.fill: parent
    source: root.primaryMaskSource
    fillMode: root.fillMode
    asynchronous: root.asynchronous
    cache: root.cache
    smooth: root.smooth
    mipmap: root.mipmap
    visible: false
  }

  ColorOverlay {
    anchors.fill: primaryMask
    source: primaryMask
    color: root.primaryColor
    visible: root.primaryMaskSource !== ""
  }

  Image {
    id: secondaryMask
    anchors.fill: parent
    source: root.secondaryMaskSource
    fillMode: root.fillMode
    asynchronous: root.asynchronous
    cache: root.cache
    smooth: root.smooth
    mipmap: root.mipmap
    visible: false
  }

  ColorOverlay {
    anchors.fill: secondaryMask
    source: secondaryMask
    color: root.secondaryColor
    visible: root.secondaryMaskSource !== ""
  }

  Image {
    id: faultMask
    anchors.fill: parent
    source: root.faultMaskSource
    fillMode: root.fillMode
    asynchronous: root.asynchronous
    cache: root.cache
    smooth: root.smooth
    mipmap: root.mipmap
    visible: false
  }

  ColorOverlay {
    anchors.fill: faultMask
    source: faultMask
    color: root.faultColor
    visible: root.faultMaskSource !== ""
  }
}
