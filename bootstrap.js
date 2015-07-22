requirejs(
  [
    "forge",
    "gserializer",
    "test",
  ],
  function () {
  	console.log("require - sucess", arguments);
  	window.forge = arguments[0];
  	start();
  },
  function () {
    console.error("require - error", arguments);
  }
);

function start() {
  test();
}