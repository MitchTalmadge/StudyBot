import preInit from "./pre-init";

process.env.NODE_ENV = "development";

preInit()
  .then(() => {
    require("../main");
  });
