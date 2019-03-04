module.exports = function (filename) {
  const glob = require('glob')
  const fs = require('fs')
  let files = glob.sync(filename + '_*.json')
  const studyJSON = require('./'+filename+'.json');
  const categories = {"2": "masses","3":"calcifications","4": "architectural distortion","5": "asymmetries" }
  const template = {
    "user_name": "",
    "file_name": filename,
    "study": {},
    "annotation": [],
    "ROIs": []
  }
  
  const VIEW_TEMPLATE = {
    "view": "",
    "data": {
      "images": [],
      "annotations": [],
      "categories": [],
      "annotation": []
    }
  }

  const LAYER_TEMPLATE = 
    {
      "name": "",
      "applyMatrix": true
    }

  const SEGMENT_TEMPLATE = 
    {
    "applyMatrix": true,
    "data": {"countable": true},
    "segments": [],
    "closed": true,
    "fillColor": [0,0,0,0.001],
    "strokeColor": ["hsl",180,1,0.876,1],
    "strokeWidth": 26.83796,
    "dashArray": []
  }

  function circleROI(y, viewName){
    let category_ids = y.category_ids
    const layer = category_ids.slice(0,1)
    let properties = category_ids.slice(1).map(String)
    const roi = {
      "id": y.id,
      "properties": properties,
      "layer": categories[layer],
      "X": y.circle[0],
      "Y": y.circle[1],
      "radius": y.circle[2],
      "view": viewName,
      "bbox": {
        "topLeft": [y.bbox[0], y.bbox[1]],
        "topRight": [y.bbox[0] + y.bbox[2], y.bbox[1]],
        "bottomRight": [y.bbox[0] + y.bbox[2], y.bbox[1]+y.bbox[3]],
        "bottomLeft": [y.bbox[0], y.bbox[1] + y.bbox[3]]
      },
      "malignant": y.malignant
    }
    return roi
  }
  function freehandROI(y, viewName, segments) {
    let category_ids = y.category_ids
    const layer = category_ids.slice(0, 1)
    let properties = category_ids.slice(1).map(String)
    const roi = {
      "id": y.id,
      "properties": properties,
      "layer": categories[layer],
      "X": (y.bbox[0]+y.bbox[2]/2),
      "Y": (y.bbox[1] + y.bbox[3]/2),
      "segments":segments,
      "view": viewName,
      "bbox": {
        "topLeft": [y.bbox[0], y.bbox[1]],
        "topRight": [y.bbox[0] + y.bbox[2], y.bbox[1]],
        "bottomRight": [y.bbox[0] + y.bbox[2], y.bbox[1] + y.bbox[3]],
        "bottomLeft": [y.bbox[0], y.bbox[1] + y.bbox[3]]
      },
      "malignant": y.malignant
    }
    return roi
  }
  function circleSegment(y) {
    const curve = (y.circle[2] * 0.5525)
    const segments = [
      [[y.circle[0] - y.circle[2], y.circle[1]], [0, curve], [0, -curve]],
      [[y.circle[0], y.circle[1] - y.circle[2]], [-curve, 0], [curve, 0]],
      [[y.circle[0] + y.circle[2], y.circle[1]], [0, -curve], [0, curve]],
      [[y.circle[0], y.circle[1] + y.circle[2]], [curve, 0], [-curve, 0]]
    ]
    return segments
  }

  function freehandSegment(y){
    const segments = y.segmentation.reduce(function (result, value, index, array) {
      if (index % 2 === 0)
        result.push(array.slice(index, index + 2));
      return result;
    }, []);
    return segments
  }

  function createChildrenTemplate(x, y, viewName) {
    const childrenTemplate = { ...LAYER_TEMPLATE }
    delete childrenTemplate.name
    const subchildrenTemplate = { ...SEGMENT_TEMPLATE}
    if(y.circle){
      const segments = circleSegment(y)
      subchildrenTemplate.segments = segments
      const rois = circleROI(y, viewName)
      template.ROIs.push(rois)
    }else if(y.segmentation){
      const segments = freehandSegment(y)
      subchildrenTemplate.segments = segments
      const rois = freehandROI(y, viewName, segments)
      template.ROIs.push(rois)
    }
    if (x == 3){
      subchildrenTemplate.strokeColor = ["hsl", 300, 1, 0.876, 1]
    } else if (x == 4) {
      subchildrenTemplate.strokeColor = ["hsl", 0, 0, 1, 1]
    } else if (x == 5) {
      subchildrenTemplate.strokeColor = ["hsl", 60, 1, 0.876, 1]
    }
    
    childrenTemplate.children = [["Path", { ...subchildrenTemplate }]]
    return childrenTemplate
  }  
  template.study = studyJSON
  files.map(viewFilename=>{
    const viewJSON = require('./' + viewFilename)
    const viewAnnotation = { ...VIEW_TEMPLATE }
    viewAnnotation.data = viewJSON
    viewAnnotation.view = viewJSON.images[0].file_name

    const layer1 = { ...LAYER_TEMPLATE }
    const layer2 = { ...LAYER_TEMPLATE }
    const layer3 = { ...LAYER_TEMPLATE }
    const layer4 = { ...LAYER_TEMPLATE }

    layer1.name = categories["2"]
    layer2.name = categories["3"]
    layer3.name = categories["4"]
    layer4.name = categories["5"]

    viewJSON.categories.some(item => {
      if (item.id == 2) {
        layer1.children = []
      } else if (item.id == 3) {
        layer2.children = []
      } else if (item.id == 4) {
        layer3.children = []
      } else if (item.id == 5) {
        layer4.children = []
      }
    })

    viewJSON.annotations.forEach(function (x) {
      let viewName = viewJSON.images[0].file_name
      if (x.category_ids[0] == 2) {
        const layer1children = createChildrenTemplate(2, x, viewName)
        layer1.children.push(["Group", layer1children])
      } else if (x.category_ids[0] == 3) {
        const layer2children = createChildrenTemplate(3, x, viewName)
        layer2.children.push(["Group", layer2children])
      } else if (x.category_ids[0] == 4) {
        const layer3children = createChildrenTemplate(4, x, viewName)
        layer3.children.push(["Group", layer3children])
      } else if (x.category_ids[0] == 5) {
        const layer4children = createChildrenTemplate(5, x, viewName)
        layer4.children.push(["Group", layer4children])
      }
    })
    
    viewAnnotation.data.annotation = [["Layer", layer1], ["Layer", layer2], ["Layer", layer3], ["Layer", layer4]]
    template.annotation.push(viewAnnotation)
    
  })
  
  template.annotation.sort((a, b) => (a.data.images[0].id > b.data.images[0].id) ? 1 : ((a.data.images[0].id < b.data.images[0].id) ? -1 : 0)); 

  //console.log( template )
  fs.writeFileSync(filename+'_LoadFile.json', JSON.stringify(template))
}