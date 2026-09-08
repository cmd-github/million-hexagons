// Bound the complete rotated source, including at non-quarter-turn angles.
export function rotatedImageBox(width,height,degrees){const angle=degrees*Math.PI/180,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));return{width:width*c+height*s,height:width*s+height*c};}
export function containRotatedImage(width,height,boxWidth,boxHeight,degrees){const box=rotatedImageBox(width,height,degrees),scale=Math.min(boxWidth/box.width,boxHeight/box.height);return{width:width*scale,height:height*scale};}
