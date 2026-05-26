(function(global){

"use strict";

const HEADER = "TBL1"; // file signature

function encode(data){

  const json = typeof data === "string"
    ? data
    : JSON.stringify(data);

  const encoder = new TextEncoder();

  const jsonBytes = encoder.encode(json);

  // create buffer: HEADER + JSON bytes
  const headerBytes = new TextEncoder().encode(HEADER);

  const buffer = new Uint8Array(headerBytes.length + jsonBytes.length);

  buffer.set(headerBytes, 0);
  buffer.set(jsonBytes, headerBytes.length);

  return buffer;
}

function decode(buffer){

  const bytes = new Uint8Array(buffer);

  const header = new TextDecoder().decode(bytes.slice(0,4));

  if(header !== HEADER){
    throw new Error("Invalid .tbl file (bad header)");
  }

  const jsonBytes = bytes.slice(4);

  const json = new TextDecoder().decode(jsonBytes);

  return json;
}

class TBLTable {

  constructor(data = {}) {
    this.columns = data.columns || [];
    this.rows = data.rows || [];
    this.meta = data.meta || { created: new Date().toISOString() };
  }

  addColumn(name){
    this.columns.push(name);
    this.rows.forEach(r => r.push(""));
    return this;
  }

  addRow(row = []){
    const newRow = [];
    for(let i = 0; i < this.columns.length; i++){
      newRow.push(row[i] ?? "");
    }
    this.rows.push(newRow);
    return this;
  }

  toObject(){
    return {
      columns: this.columns,
      rows: this.rows,
      meta: this.meta
    };
  }

  toBinary(){
    return encode(this.toObject());
  }

  download(filename = "table.tbl"){

    const blob = new Blob([this.toBinary()], {
      type: "application/octet-stream"
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }
}

const TBL = {

  Table: TBLTable,

  encode,
  decode,

  parse(buffer){

    const json = decode(buffer);
    return new TBLTable(JSON.parse(json));

  },

  async fetch(url){

    const res = await fetch(url);
    const buffer = await res.arrayBuffer();

    return this.parse(buffer);

  },

  async open(file){

    const buffer = await file.arrayBuffer();
    return this.parse(buffer);

  }

};

global.TBL = TBL;

})(window);