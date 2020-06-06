export class TreeModel {
    id: string;
    name: string;
    role: string;
    color: string;
    left?: number;
    top?: number;
    parentId?: string;
    child: TreeModel[];
}