const express = require('express');
const app = express();

const router = express.Router();
router.get('/hello', (req, res) => res.send('hi'));
router.post('/world', (req, res) => res.send('world'));

app.use('/api', router);

function getEndpoints(app) {
  const endpoints = [];
  function print(path, layer) {
    if (layer.route) {
      layer.route.stack.forEach(print.bind(null, path.concat(split(layer.route.path))))
    } else if (layer.name === 'router' && layer.handle.stack) {
      layer.handle.stack.forEach(print.bind(null, path.concat(split(layer.regexp))))
    } else if (layer.method) {
      endpoints.push({
        method: layer.method.toUpperCase(),
        path: path.concat(split(layer.regexp)).filter(Boolean).join('/')
      })
    }
  }

  function split(thing) {
    if (typeof thing === 'string') {
      return thing.split('/')
    } else if (thing.fast_slash) {
      return ''
    } else {
      var match = thing.toString()
        .replace('\\/?', '')
        .replace('(?=\\/|$)', '$')
        .match(/^\/\^((?:\\[.*+?^${}()|[\]\\\/]|[^.*+?^${}()|[\]\\\/])*)\$\//)
      return match ? match[1].replace(/\\(.)/g, '$1').split('/') : '<complex:' + thing.toString() + '>'
    }
  }

  app._router.stack.forEach(print.bind(null, []))
  return endpoints;
}

console.log(getEndpoints(app));
