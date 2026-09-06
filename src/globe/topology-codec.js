// Lossless byte-plane delta coding. IDs and Float32 bit patterns are identical
// to the canonical asset; no geometric quantization is involved.
const strides={centres:3,vertices:3,rings:6,neighbours:6,degrees:1,areas:1};
export function encodeTopology(buffer,manifest) {
  const output=new Uint8Array(buffer.byteLength);output.set(new Uint8Array(buffer,0,32));
  for(const [name,{offset,length}] of Object.entries(manifest.sections)) {
    const source=new Uint32Array(buffer,offset,length),stride=strides[name];
    for(let i=0;i<length;i++) {
      const delta=(source[i]-(i>=stride?source[i-stride]:0))>>>0;
      for(let byte=0;byte<4;byte++)output[offset+byte*length+i]=(delta>>>(byte*8))&255;
    }
  }
  return output;
}
export function decodeTopology(bytes,manifest) {
  const buffer=new ArrayBuffer(bytes.byteLength);new Uint8Array(buffer,0,32).set(bytes.subarray(0,32));
  for(const [name,{offset,length}] of Object.entries(manifest.sections)) {
    const target=new Uint32Array(buffer,offset,length),stride=strides[name];
    for(let i=0;i<length;i++) {
      const delta=(bytes[offset+i]|bytes[offset+length+i]<<8|bytes[offset+2*length+i]<<16|bytes[offset+3*length+i]<<24)>>>0;
      target[i]=(delta+(i>=stride?target[i-stride]:0))>>>0;
    }
  }
  return buffer;
}
