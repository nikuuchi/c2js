var _ua = (function(){
 return {
  ltIE6:typeof window.addEventListener == "undefined" && typeof document.documentElement.style.maxHeight == "undefined",
  ltIE7:typeof window.addEventListener == "undefined" && typeof document.querySelectorAll == "undefined",
  ltIE8:typeof window.addEventListener == "undefined" && typeof document.getElementsByClassName == "undefined",
  ltIE9:document.uniqueID && !window.matchMedia,
  gtIE10:document.uniqueID && document.documentMode >= 10,
  Trident:document.uniqueID,
  Gecko:'MozAppearance' in document.documentElement.style,
  Presto:window.opera,
  Blink:window.chrome,
  Webkit:!window.chrome && 'WebkitAppearance' in document.documentElement.style,
  Touch:typeof document.ontouchstart != "undefined",
  Mobile:typeof window.orientation != "undefined",
  Pointer:window.navigator.pointerEnabled,
  MSPoniter:window.navigator.msPointerEnabled
 }
})();
