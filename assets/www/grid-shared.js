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

  // need error handler to automatically remove localStorage(layoutName)
  // if it has been changed to avoid Muuri sort error
  //window.localStorage.removeItem(layoutName);
  var layout = window.localStorage.getItem(layoutName);
  if (layout) {
    loadLayout(grid, layout);
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