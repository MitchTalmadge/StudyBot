import preInit from './pre-init';

preInit()
  .then(() => {
    // eslint-disable-next-line global-require
    require('../src/main');
  });
