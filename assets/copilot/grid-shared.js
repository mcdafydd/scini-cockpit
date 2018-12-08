function initGrid(layoutName) {
  var grid = new Muuri('.grid', {
    dragEnabled: true,
    layoutOnInit: false,
    dragStartPredicate: function (item, event) {
      if (event.target.localName === 'input' || event.target.localName === 'button') {
        return false;
      }
      return Muuri.ItemDrag.defaultStartPredicate(item, event);
    }
  }).on('move', function () {
    saveLayout(grid, layoutName);
  });

  var layout = window.localStorage.getItem(layoutName);
  if (layout) {
    try {
      loadLayout(grid, layout);
    }
    catch(e) {
      console.log('Muuri loadLayout error - removing old layout and reloading page');
      let reloaded = window.localStorage.getItem(`${layoutName}-reloaded`);
      if (reloaded) {
        if (reloaded === 1) {
          window.localStorage.setItem(`${layoutName}-reloaded`, ++reloaded);
          window.localStorage.removeItem(layoutName);
          window.location.reload(true);
        }
        else {
          throw 'FATAL: Cannot fix Muuri saved layout';
        }
      }
      else {
        window.localStorage.setItem(`${layoutName}-reloaded`, 1);
        window.localStorage.removeItem(layoutName);
        window.location.reload(true);
      }
    }
    finally {
      // should only get here if loadLayout() was successful
      window.localStorage.removeItem(`${layoutName}-reloaded`);
    }
  } else {
    grid.layout(true);
  }
}

function serializeLayout(grid) {
  var itemIds = grid.getItems().map(function (item) {
    return item.getElement().getAttribute('data-id');
  });
  return JSON.stringify(itemIds);
}

function saveLayout(grid, layoutName) {
  var layout = serializeLayout(grid);
  window.localStorage.setItem(layoutName, layout);
}

function loadLayout(grid, serializedLayout) {
  var layout = JSON.parse(serializedLayout);
  var currentItems = grid.getItems();
  var currentItemIds = currentItems.map(function (item) {
    return item.getElement().getAttribute('data-id')
  });
  var newItems = [];
  var itemId;
  var itemIndex;

  for (var i = 0; i < layout.length; i++) {
    itemId = layout[i];
    itemIndex = currentItemIds.indexOf(itemId);
    if (itemIndex > -1) {
      newItems.push(currentItems[itemIndex])
    }
  }

  grid.sort(newItems, {
    layout: 'instant'
  });
}
