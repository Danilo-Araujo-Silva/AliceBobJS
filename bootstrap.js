requirejs(
  [
    "forge",
    "gserializer",
    "test",
  ],
  function () {
  	console.log("require - sucess", arguments);
  	window.forge = arguments[0];
  	window.gserializer = new ONEGEEK.GSerializer();
  	start();
  },
  function () {
    console.error("require - error", arguments);
  }
);

function start() {
  test();
}