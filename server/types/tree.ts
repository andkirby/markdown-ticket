export type TreeNodeType = 'file' | 'folder'

export interface TreeNode {
  name: string
  path: string
  type: TreeNodeType
  children?: TreeNode[]
}
