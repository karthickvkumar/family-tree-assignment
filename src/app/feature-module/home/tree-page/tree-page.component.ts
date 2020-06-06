import { Component, OnInit, ViewChild, ElementRef, Renderer2 } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { fabric } from 'fabric';

@Component({
  selector: 'app-tree-page',
  templateUrl: './tree-page.component.html',
  styleUrls: ['./tree-page.component.css']
})
export class TreePageComponent implements OnInit {
  familyTree: any;
  nodeUpdateFrom: FormGroup;
  selectedNode: any = {};
  focusedNode: any = {};
  @ViewChild('treeOptions', { static: true }) el: ElementRef;
  @ViewChild('editLayout', { static: true }) layoutEl: ElementRef;

  constructor(private renderer: Renderer2) {
    fabric.Canvas.prototype.getAbsoluteCoords = function (object) {
      return {
        left: object.left + this._offset.left,
        top: object.top + this._offset.top
      };
    };

    fabric.Canvas.prototype.getItemsById = function (id) {
      let objectList = [],
        objects = this.getObjects();

      for (let i = 0, len = this.size(); i < len; i++) {
        if (objects[i].id && objects[i].id === id) {
          objectList.push(objects[i]);
        }
      }
      return objectList[0];
    };
  }

  ngOnInit() {
    this.familyTree = new fabric.Canvas('family-tree-editor');

    this.nodeUpdateFrom = new FormGroup({
      name: new FormControl(),
      role: new FormControl(),
      color: new FormControl()
    });

    this.familyTree.on('mouse:over', (node) => {
      if (node && node.target) {
        this.focusedNode = node.target;
        this.familyTree.setActiveObject(node.target);
        this.familyTree.renderAll();
      }
    });

    this.familyTree.on('mouse:out', (node) => {
      if (node && node.target) {
        this.familyTree.discardActiveObject();
        this.familyTree.renderAll();
      }
    });

    this.familyTree.on('object:moving', (node) => {
      var activeNode = node.target;
      if (activeNode.childrens instanceof Array && activeNode.childrens.length > 0) {
        activeNode.childrens.forEach((childID) => {
          let x1 = activeNode.get('left') + activeNode.get('width') / 2;
          let y1 = activeNode.get('top') + activeNode.get('height');
          activeNode['line-' + childID] && activeNode['line-' + childID].set({ 'x1': x1, 'y1': y1 });
          let childNode = this.familyTree.getItemsById(childID);
          let x2 = childNode.get('left') + childNode.get('width') / 2;
          let y2 = childNode.get('top');
          childNode['line-' + childID] && childNode['line-' + childID].set({ 'x2': x2, 'y2': y2 });
          this.familyTree.renderAll();
        });
      }
      if (activeNode.parentId) {
        let x2 = activeNode.get('left') + activeNode.get('width') / 2;
        let y2 = activeNode.get('top');
        activeNode['line-' + activeNode.id] && activeNode['line-' + activeNode.id].set({ 'x2': x2, 'y2': y2 });
        this.familyTree.renderAll();
      }
    });

    const fabricNode = this.getNode();
    fabricNode.forEach((node) => {
      this.alignToPosition(node);
      node.on('moving', () => {
        this.positionBtn(node)
      });
      node.on('selected', () => {
        this.positionBtn(node)
      });
      this.familyTree.add(node);
    });
    this.createLines();
    let target = this.familyTree.getItemsById("group-2");
    if (target) {
      this.onExpand(null, target);
      this.familyTree.renderAll();
    }
  }

  onAddNode(form) {
    if (this.selectedNode && this.selectedNode.mode === 'edit') {
      this.selectedNode._objects[0].set({ fill: form.value.color })
      this.selectedNode._objects[1].set({ text: form.value.name })
      this.selectedNode._objects[2].set({ text: form.value.role })
      this.familyTree.renderAll();
      this.closeLayout();
    }
    else {
      form.value.id = this.generateUID();
      form.value.parentId = this.selectedNode.id;
      let createdNode = this.createNode(form.value);
      this.alignToPosition(createdNode);
      let x1 = this.selectedNode.get('left') + this.selectedNode.get('width') / 2;
      let y1 = this.selectedNode.get('top') + this.selectedNode.get('height');
      let x2 = createdNode.get('left') + createdNode.get('width') / 2;
      let y2 = createdNode.get('top');
      let line = this.drawLine([x1, y1, x2, y2]);
      line.set({ opacity: 0 });
      createdNode.on('moving', () => {
        this.positionBtn(createdNode);
      });
      createdNode.on('selected', () => {
        this.positionBtn(createdNode);
      });
      this.familyTree.add(createdNode, line);
      this.selectedNode.set({
        ['line-' + createdNode.id]: line
      })
      createdNode.set({
        ['line-' + createdNode.id]: line,
        opacity: 1
      });
      this.familyTree.renderAll();
      this.makeVisible(this.selectedNode);
      form.reset();
      this.closeLayout();
    }
  }

  makeVisible(node) {
    const iterateNodes = (node: any) => {
      if (node)
        node.childrens.forEach((childId) => {
          let childNode = this.familyTree.getItemsById(childId);
          childNode.set({ opacity: 1 });
          node['line-' + childId].set({ opacity: 1 });
          if (childNode.child instanceof Array && childNode.child.length > 0) {
            iterateNodes(childNode);
          }
        });
    };
    iterateNodes(node);
    this.familyTree.renderAll();
  }

  alignToPosition(node) {
    const offsetTop = 25;
    if (node.hasOwnProperty('parentId') && node.parentId) {
      let parentNode = this.familyTree.getItemsById(node.parentId);
      let lastSibling = parentNode.childrens && parentNode.childrens instanceof Array ? this.familyTree.getItemsById(parentNode.childrens[parentNode.childrens.length - 1]) : null;
      parentNode.set({
        childrens: parentNode.childrens instanceof Array ? parentNode.childrens.concat(node.id) : [node.id]
      })
      node.set({
        top: parentNode.top + parentNode.height + offsetTop,
        left: lastSibling && lastSibling instanceof Object ? lastSibling.left + lastSibling.width : parentNode.left - (parentNode.width / 2)
      })
    }
  }

  createNode(node) {
    let wrapper = new fabric.Rect({
      width: 160, height: 80, fill: node.color
    });
    let namePlaceholder = new fabric.IText(node.name, {
      fontFamily: "Poppins",
      fontSize: 22,
      fill: "white",
      left: 65,
      top: 5
    });
    let rolePlaceholder = new fabric.IText(node.role, {
      fontFamily: "Poppins",
      fontSize: 18,
      fill: "white",
      left: 65,
      top: 35
    });
    let groupedView = new fabric.Group([wrapper, namePlaceholder, rolePlaceholder], {
      id: node.id,
      hasBorders: false,
      hasControls: false,
      left: node.left ? node.left : 0,
      top: node.top ? node.top : 0,
      parentId: node.parentId ? node.parentId : null
    });
    return groupedView;
  }

  getNode() {
    const fabricNode = [];
    const tree = [
      {
        id: 'group-1',
        name: 'Ben',
        role: 'Father',
        color: 'blue',
        left: 100,
        top: 30,
        child: []
      },
      {
        id: 'group-2',
        name: 'Peter',
        role: 'Father',
        color: 'black',
        left: 400,
        top: 30,
        child: [
          {
            id: 'group-3',
            parentId: 'group-2',
            name: 'John',
            role: 'Son',
            color: 'orange',
            child: []
          },
          {
            id: 'group-4',
            parentId: 'group-2',
            name: 'Freda',
            role: 'Daughter',
            color: 'pink',
            child: []
          }
        ]
      }
    ];

    const iterateNodes = (tree: any) => {
      if (tree)
        tree.forEach((node) => {
          fabricNode.push(this.createNode(node));
          if (node.child instanceof Array && node.child.length > 0) {
            iterateNodes(node.child);
          }
        });
    };
    iterateNodes(tree);
    return fabricNode;
  }

  createLines() {
    let treeNode = this.familyTree.getObjects();
    treeNode.forEach((node) => {
      if (node.childrens instanceof Array && node.childrens.length > 0) {
        node.childrens.forEach((childId) => {
          let childNode = this.familyTree.getItemsById(childId);
          let x1 = node.get('left') + node.get('width') / 2;
          let y1 = node.get('top') + node.get('height');
          let x2 = childNode.get('left') + childNode.get('width') / 2;
          let y2 = childNode.get('top');
          let line = this.drawLine([x1, y1, x2, y2]);
          line.set({ opacity: 0 })
          this.familyTree.add(line);
          node.set({
            ['line-' + childNode.id]: line
          })
          childNode.set({
            ['line-' + childNode.id]: line,
            opacity: 0
          })
        })
      }
    })
  }

  drawLine(coords) {
    return new fabric.Line(coords, {
      fill: 'black',
      stroke: 'black',
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
  }

  findSelectedNode(event) {
    let expandBtnDOM = this.renderer.parentNode(event.target);
    let treeOptionDOM = this.renderer.parentNode(expandBtnDOM);
    if (treeOptionDOM.id) {
      let selectedNode = this.familyTree.getItemsById(treeOptionDOM.id);
      return selectedNode;
    }
    else {
      return false
    }
  }

  onExpand(event, target: any) {
    let selectedNode;
    if (!event && target instanceof Object) {
      selectedNode = target;
    } else {
      selectedNode = this.findSelectedNode(event);
    }
    if (selectedNode) {
      if (selectedNode.childrens instanceof Array) {
        this.focusedNode = selectedNode
        this.focusedNode.isExpanded = !selectedNode.isExpanded;
        this.selectedNode = selectedNode;
        const iterateNodes = (node: any) => {
          if (selectedNode)
            node.childrens.forEach((childId) => {
              let childNode = this.familyTree.getItemsById(childId);
              childNode.set({ opacity: !selectedNode.isExpanded ? 0 : 1 });
              node['line-' + childId].set({ opacity: !selectedNode.isExpanded ? 0 : 1 });
              this.familyTree.renderAll();
              if (childNode.childrens instanceof Array && childNode.childrens.length > 0) {
                iterateNodes(childNode);
              }
            });
        };
        iterateNodes(selectedNode);
      } else {
        alert('No child nodes available')
      }
    }
  }

  addChild(event) {
    let selectedNode = this.findSelectedNode(event);
    if (selectedNode) {
      this.layoutEl.nativeElement.style.width = "250px";
      this.selectedNode = selectedNode;
      this.selectedNode.mode = 'add';
    }
  }

  onEdit(event) {
    let selectedNode = this.findSelectedNode(event);
    if (selectedNode) {
      this.layoutEl.nativeElement.style.width = "250px";
      this.selectedNode = selectedNode;
      this.selectedNode.mode = 'edit';
      this.selectedNode.color_code = selectedNode._objects[0].fill;
      this.nodeUpdateFrom.setValue({
        name: selectedNode._objects[1].text,
        role: selectedNode._objects[2].text,
        color: selectedNode._objects[0].fill
      });
    }
  }

  generateUID() {
    let s = [];
    let hexDigits = "0123456789abcdef";
    for (let i = 0; i < 36; i++) {
      s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = "4";
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);
    s[8] = s[13] = s[18] = s[23] = "-";
    let uuid = s.join("");
    return 'line-' + uuid;
  }

  positionBtn(obj) {
    let offsetHeight = 75;
    var absCoords = this.familyTree.getAbsoluteCoords(obj);
    this.el.nativeElement.id = obj.id;
    this.el.nativeElement.style.opacity = obj.get('opacity')
    this.el.nativeElement.style.left = (absCoords.left) + 'px';
    this.el.nativeElement.style.top = (absCoords.top + obj.height - offsetHeight) + 'px';
  }

  closeLayout() {
    this.layoutEl.nativeElement.style.width = "0px";
  }
}
