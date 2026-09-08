import fs from 'node:fs/promises';
import * as icons from 'simple-icons';
const names=['Adidas','Apple','Cocacola','Google','Ikea','Mastercard','Mcdonalds','Netflix','Nike','Samsung','Spotify','Youtube'];
const colours=['08090b','f4f4f1','f40009','f7f7f3','0058a3','f2f0eb','da291c','090909','f3f1eb','1428a0','1ed760','ffffff'];
await fs.mkdir('public/brands',{recursive:true});
await Promise.all(names.map((name,i)=>fs.writeFile(`public/brands/${i}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#${colours[i]}"/><path transform="translate(8 8)" fill="${[1,3,5,8,10,11].includes(i)?'#101820':'#fff'}" d="${icons['si'+name].path}"/></svg>`)));
