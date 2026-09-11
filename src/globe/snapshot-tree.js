// A fixed-size bitset, not a list of every placement or every tile URL.
// Level 10 covers 8,388,606 cube-quadtree nodes in 1,048,576 bytes.
export const SNAPSHOT_MAX_LEVEL=10;
export const SNAPSHOT_TREE_BYTES=Math.ceil(6*(4**11-1)/3/8);
export function nodeIndex(face,level,x,y){return face*((4**11-1)/3)+(4**level-1)/3+y*2**level+x;}
export function newTree(){return new Uint8Array(SNAPSHOT_TREE_BYTES);}
export function validateTree(tree){if(tree.length!==SNAPSHOT_TREE_BYTES)throw Error('Incomplete snapshot tree');for(let face=0;face<6;face++)if(!hasNode(tree,face,0,0,0))throw Error('Missing snapshot overview');return tree;}
export function setNode(tree,face,level,x,y){const i=nodeIndex(face,level,x,y);tree[i>>3]|=1<<(i&7);}
export function hasNode(tree,face,level,x,y){if(level<0||level>SNAPSHOT_MAX_LEVEL)return false;const i=nodeIndex(face,level,x,y);return !!(tree[i>>3]&(1<<(i&7)));}
export function hasChildren(tree,face,level,x,y){return level<SNAPSHOT_MAX_LEVEL&&[0,1,2,3].some(i=>hasNode(tree,face,level+1,x*2+i%2,y*2+Math.floor(i/2)));}
