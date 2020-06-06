import { Component, OnInit, ViewChild, ElementRef, Renderer2 } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { TreeModel } from '../../../core-models/tree.model';
import { fabric } from 'fabric';

@Component({
  selector: 'app-tree-page',
  templateUrl: './tree-page.component.html',
  styleUrls: ['./tree-page.component.css']
})
export class TreePageComponent implements OnInit {
  familyTree: fabric;
  nodeUpdateFrom: FormGroup;
  selectedNode: fabric.Object | any = {};
  focusedNode: fabric.Object | any = {};
  /* DOM reference for the tree options - Edit, Expand, Add node  */
  @ViewChild('treeOptions', { static: true }) el: ElementRef;
  /* DOM reference for the sidebar drawer  */
  @ViewChild('editLayout', { static: true }) layoutEl: ElementRef;

  constructor(private renderer: Renderer2) {
    /* Extended the Fabric JS to getAbsoluteCoords  */
    fabric.Canvas.prototype.getAbsoluteCoords = function (object: fabric.Object) {
      return {
        left: object.left + this._offset.left,
        top: object.top + this._offset.top
      };
    };

    /* Extended the Fabric JS to object based on ID  */
    fabric.Canvas.prototype.getItemsById = function (id: string): fabric.Object | any {
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

  /* Initialized the default node creation  */
  ngOnInit() {
    try {
      /* Initialized Fabric Canvas by creating a Instance  */
      this.familyTree = new fabric.Canvas('family-tree-editor');
      /* Initialized the reactive form instance for edit and add option  */
      this.nodeUpdateFrom = new FormGroup({
        name: new FormControl(),
        role: new FormControl(),
        color: new FormControl()
      });
      /* Capture the current target element based on move hover interaction  */
      this.familyTree.on('mouse:over', (node: fabric.Object | any) => {
        if (node && node.target) {
          this.focusedNode = node.target;
          this.familyTree.setActiveObject(node.target);
          this.familyTree.renderAll();
        }
      });
      /* Capture the current target element based on move out interaction  */
      this.familyTree.on('mouse:out', (node: fabric.Object | any) => {
        if (node && node.target) {
          this.familyTree.discardActiveObject();
          this.familyTree.renderAll();
        }
      });
      /* Capture the current target element based on move moving interaction  */
      this.familyTree.on('object:moving', (node: fabric.Object | any) => {
        var activeNode = node.target;
        if (activeNode.childrens instanceof Array && activeNode.childrens.length > 0) {
          /* Setting the x1, y1, x2, y2 coordinates for lines  on moving*/
          activeNode.childrens.forEach((childID: string[]) => {
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
      /* Binding the line ponter position for each node */
      const fabricNode = this.getNode();
      fabricNode.forEach((node: fabric.Object | any) => {
        this.alignToPosition(node);
        /* Binding the line ponter position for each node at moving state*/
        node.on('moving', () => {
          this.positionBtn(node)
        });
        /* Binding the line ponter position for each node at selection state*/
        node.on('selected', () => {
          this.positionBtn(node)
        });
        this.familyTree.add(node);
      });
      this.createLines();
      let target = this.familyTree.getItemsById("group-2");
      if (target) {
        /* Triggering the default expand functionality*/
        this.onExpand(null, target);
        this.familyTree.renderAll();
      }
    }
    catch (error) {

    }
  }

  onAddNode(form: any) {
    try {
      if (this.selectedNode && this.selectedNode.mode === 'edit') {
        /* Handles the node update and set the updated value to each node*/
        this.selectedNode._objects[0].set({ fill: form.value.color })
        this.selectedNode._objects[1].set({ text: form.value.name })
        this.selectedNode._objects[2].set({ text: form.value.role })
        this.familyTree.renderAll();
        this.closeLayout();
      }
      else {
        /* Handles the newly added node value*/
        form.value.id = this.generateUID();
        form.value.parentId = this.selectedNode.id;
        let createdNode = this.createNode(form.value);
        this.alignToPosition(createdNode);
        /* Extracting the lines coordinate from the parent node position*/
        let x1 = this.selectedNode.get('left') + this.selectedNode.get('width') / 2;
        let y1 = this.selectedNode.get('top') + this.selectedNode.get('height');
        let x2 = createdNode.get('left') + createdNode.get('width') / 2;
        let y2 = createdNode.get('top');
        /* Binding the line coordinates for newly created node*/
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
        /*Re-render the canvas to show the result */
        this.familyTree.renderAll();
        this.makeVisible(this.selectedNode);
        /* Clearing the reactive form by resting its value*/
        form.reset();
        this.closeLayout();
      }
    }
    catch (error) {

    }
  }

  makeVisible(node: any) {
    try {
      /*Iterating each and every child node, to make it visible based on expand */
      const iterateNodes = (node: any) => {
        if (node)
          node.childrens.forEach((childId: string[]) => {
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
    catch (error) {

    }
  }

  alignToPosition(node: any) {
    try {
      /* Offset value to set the space distance between siblings */
      const offsetTop = 25;
      if (node.hasOwnProperty('parentId') && node.parentId) {
        let parentNode = this.familyTree.getItemsById(node.parentId);
        let lastSibling = parentNode.childrens && parentNode.childrens instanceof Array ? this.familyTree.getItemsById(parentNode.childrens[parentNode.childrens.length - 1]) : null;
        /* Setting the relative positions of parent and child nodes*/
        parentNode.set({
          childrens: parentNode.childrens instanceof Array ? parentNode.childrens.concat(node.id) : [node.id]
        })
        node.set({
          top: parentNode.top + parentNode.height + offsetTop,
          left: lastSibling && lastSibling instanceof Object ? lastSibling.left + lastSibling.width : parentNode.left - (parentNode.width / 2)
        })
      }
    }
    catch (error) {

    }
  }

  createNode(node): fabric.Object {
    try {
      /*Creating the fabric rectangle object to create the wrapper */
      let wrapper: fabric.Rect = new fabric.Rect({
        width: 160, height: 80, fill: node.color
      });
      /*Creating the fabric iText object to create the placeholder for name */
      let namePlaceholder: fabric.IText = new fabric.IText(node.name, {
        fontFamily: "Poppins",
        fontSize: 22,
        fill: "white",
        left: 65,
        top: 5
      });
      /*Creating the fabric iText object to create the placeholder for role */
      let rolePlaceholder: fabric.IText = new fabric.IText(node.role, {
        fontFamily: "Poppins",
        fontSize: 18,
        fill: "white",
        left: 65,
        top: 35
      });
      /*Grouping the wrapper, name and role into a single object */
      let groupedView: fabric.Group = new fabric.Group([wrapper, namePlaceholder, rolePlaceholder], {
        id: node.id,
        hasBorders: false,
        hasControls: false,
        left: node.left ? node.left : 0,
        top: node.top ? node.top : 0,
        parentId: node.parentId ? node.parentId : null
      });
      return groupedView;
    }
    catch (error) {

    }
  }

  getNode(): fabric.Object {
    try {
      const fabricNode: fabric.Object = [];
      /*Initializing the list all node API using HTTP method */
      const tree: TreeModel[] = [
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
      /*Iterating the node and assign it to each of its parent and child relationship */
      const iterateNodes = (tree: TreeModel[]) => {
        if (tree)
          tree.forEach((node) => {
            fabricNode.push(this.createNode(node));
            if (node.child instanceof Array && node.child.length > 0) {
              iterateNodes(node.child);
            }
          });
      };
      iterateNodes(tree);
      /*Returning the collection of node */
      return fabricNode;
    }
    catch (error) {

    }
  }

  createLines() {
    try {
      /*To get all the nodes in the canvas */
      let treeNode: fabric.Object = this.familyTree.getObjects();
      treeNode.forEach((node: fabric.Object) => {
        if (node.childrens instanceof Array && node.childrens.length > 0) {
          node.childrens.forEach((childId: string[]) => {
            /* Extracting the lines coordinate from the parent node position*/
            let childNode = this.familyTree.getItemsById(childId);
            let x1 = node.get('left') + node.get('width') / 2;
            let y1 = node.get('top') + node.get('height');
            let x2 = childNode.get('left') + childNode.get('width') / 2;
            let y2 = childNode.get('top');
            /* Binding the line coordinates for newly created node*/
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
      });
    }
    catch (error) {

    }
  }

  drawLine(coords: number[]) {
    try {
      /* Creating a new line instace based on coordinates*/
      return new fabric.Line(coords, {
        fill: 'black',
        stroke: 'black',
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });
    }
    catch (error) {

    }
  }

  findSelectedNode(event: any) {
    try {
      /* Finding the parentNode of the triggered target*/
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
    catch (error) {

    }
  }

  onExpand(event: any, target: any | fabric.Object) {
    try {
      let selectedNode: fabric.Object;
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
          /* Iterating the childrens and enabling it expand or collspan based on option*/
          const iterateNodes = (node: fabric.Object) => {
            if (selectedNode)
              node.childrens.forEach((childId: string[]) => {
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
          /* Throw alert if an node doesnt have childern*/
          alert('No child nodes available')
        }
      }
    }
    catch (error) {

    }
  }

  addChild(event: any) {
    try {
      let selectedNode = this.findSelectedNode(event);
      if (selectedNode) {
        /* Responsible for triggring the sidebar drawer*/
        this.layoutEl.nativeElement.style.width = "250px";
        this.selectedNode = selectedNode;
        this.selectedNode.mode = 'add';
      }
    }
    catch (error) {

    }
  }

  onEdit(event: any) {
    try {
      let selectedNode = this.findSelectedNode(event);
      if (selectedNode) {
        /* Responsible for triggring the sidebar drawer*/
        this.layoutEl.nativeElement.style.width = "250px";
        this.selectedNode = selectedNode;
        this.selectedNode.mode = 'edit';
        this.selectedNode.color_code = selectedNode._objects[0].fill;
        /* Updating the current modified node values to fabric instance*/
        this.nodeUpdateFrom.setValue({
          name: selectedNode._objects[1].text,
          role: selectedNode._objects[2].text,
          color: selectedNode._objects[0].fill
        });
      }
    }
    catch (error) {

    }
  }

  generateUID(): string {
    try {
      /* To generate a unique UID for each node*/
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
    catch (error) {

    }
  }

  positionBtn(obj: fabric.Object) {
    try {
      let offsetHeight = 75;
      var absCoords = this.familyTree.getAbsoluteCoords(obj);
      this.el.nativeElement.id = obj.id;
      this.el.nativeElement.style.opacity = obj.get('opacity')
      this.el.nativeElement.style.left = (absCoords.left) + 'px';
      this.el.nativeElement.style.top = (absCoords.top + obj.height - offsetHeight) + 'px';
    }
    catch (error) {

    }
  }

  closeLayout() {
    try {
      this.layoutEl.nativeElement.style.width = "0px";
    }
    catch (error) {

    }
  }
}
