// Shared cube projection for tile compilation, rendering and publication.
export const CUBE_FACES = [
  { n:[1,0,0], u:[0,0,-1], v:[0,1,0] },
  { n:[-1,0,0], u:[0,0,1], v:[0,1,0] },
  { n:[0,1,0], u:[1,0,0], v:[0,0,-1] },
  { n:[0,-1,0], u:[1,0,0], v:[0,0,1] },
  { n:[0,0,1], u:[1,0,0], v:[0,1,0] },
  { n:[0,0,-1], u:[-1,0,0], v:[0,1,0] },
];
export function cubePoint(face,x,y) {
  const {n,u,v}=CUBE_FACES[face],p=n.map((a,k)=>a+u[k]*x+v[k]*y),length=Math.hypot(...p);
  return p.map(a=>a/length);
}
export function cubeProject(face,p) {
  const {n,u,v}=CUBE_FACES[face],dot=a=>a.reduce((s,b,k)=>s+b*p[k],0),depth=dot(n);
  return {x:dot(u)/depth,y:dot(v)/depth,depth};
}
export const tileKey=(face,level,x,y)=>`${face}/${level}/${x}/${y}`;
