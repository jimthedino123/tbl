(function(global){

"use strict";

/*
═══════════════════════════════════════
 TBL.js v4
═══════════════════════════════════════

Formats:
.tbl   → binary table
.tblx  → encrypted text table
.tbly  → packaged bundle

*/

const VERSION = 4;

const MAGIC = {
  TBL:  "TBL4",
  TBLX: "TBLX4",
  TBLY: "TBLY4"
};

const TYPES = {
  STRING: 0,
  INT: 1,
  FLOAT: 2,
  BOOL: 3
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();





/* ═══════════════════════════════════
   HELPERS
═══════════════════════════════════ */

function strBytes(str){
  return encoder.encode(str);
}

function readString(view, offsetObj){

  const len = view.getUint32(offsetObj.o);
  offsetObj.o += 4;

  const bytes = new Uint8Array(
    view.buffer,
    offsetObj.o,
    len
  );

  offsetObj.o += len;

  return decoder.decode(bytes);

}

function writeString(parts, str){

  const bytes = strBytes(str);

  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, bytes.length);

  parts.push(len);
  parts.push(bytes);

}

function concat(parts){

  let total = 0;

  for(const p of parts){
    total += p.length;
  }

  const out = new Uint8Array(total);

  let offset = 0;

  for(const p of parts){
    out.set(p, offset);
    offset += p.length;
  }

  return out;

}





/* ═══════════════════════════════════
   BASIC XOR ENCRYPTION
═══════════════════════════════════ */

function xor(str, key="tbl"){

  let out = "";

  for(let i=0;i<str.length;i++){

    out += String.fromCharCode(
      str.charCodeAt(i) ^
      key.charCodeAt(i % key.length)
    );

  }

  return out;

}

function toBase64(str){
  return btoa(unescape(encodeURIComponent(str)));
}

function fromBase64(str){
  return decodeURIComponent(escape(atob(str)));
}





/* ═══════════════════════════════════
   TABLE CLASS
═══════════════════════════════════ */

class Table {

  constructor(data={}){

    this.columns = data.columns || [];
    this.rows = data.rows || [];

    this.meta = data.meta || {
      created: new Date().toISOString(),
      theme: "dark"
    };

  }

  addColumn(name, type="STRING"){

    this.columns.push({
      name,
      type
    });

    for(const row of this.rows){
      row.push("");
    }

    return this;

  }

  addRow(data=[]){

    const row = [];

    for(let i=0;i<this.columns.length;i++){
      row.push(data[i] ?? "");
    }

    this.rows.push(row);

    return this;

  }

  toObject(){

    return {
      version: VERSION,
      columns: this.columns,
      rows: this.rows,
      meta: this.meta
    };

  }





  /* ═══════════════════════════════
     .tbl
  ═══════════════════════════════ */

  toTBL(){

    const json = JSON.stringify(this.toObject());

    const jsonBytes = strBytes(json);

    const parts = [];

    parts.push(strBytes(MAGIC.TBL));

    const len = new Uint8Array(4);
    new DataView(len.buffer).setUint32(0, jsonBytes.length);

    parts.push(len);
    parts.push(jsonBytes);

    return concat(parts);

  }





  /* ═══════════════════════════════
     .tblx
  ═══════════════════════════════ */

  toTBLX(password="tbl"){

    const json = JSON.stringify(this.toObject());

    const encrypted = xor(json, password);

    return `${MAGIC.TBLX}\n${toBase64(encrypted)}`;

  }





  /* ═══════════════════════════════
     .tbly
  ═══════════════════════════════ */

  async toTBLY(styleCSS="", password="tbl"){

    const tblx = this.toTBLX(password);

    const zip = new JSZip();

    zip.file("table.tblx", tblx);

    zip.file("style.css", styleCSS);

    zip.file("manifest.json", JSON.stringify({
      version: VERSION,
      created: new Date().toISOString()
    }, null, 2));

    return await zip.generateAsync({
      type: "blob"
    });

  }





  /* ═══════════════════════════════
     DOWNLOAD
  ═══════════════════════════════ */

  async download(options={}){

    const {
      format="tbl",
      filename="table",
      password="tbl",
      css=""
    } = options;

    let blob;
    let ext;

    if(format === "tbl"){

      blob = new Blob(
        [this.toTBL()],
        { type:"application/octet-stream" }
      );

      ext = ".tbl";

    }

    else if(format === "tblx"){

      blob = new Blob(
        [this.toTBLX(password)],
        { type:"text/plain" }
      );

      ext = ".tblx";

    }

    else if(format === "tbly"){

      blob = await this.toTBLY(css, password);

      ext = ".tbly";

    }

    else {
      throw new Error("Unknown format");
    }

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = filename + ext;

    document.body.appendChild(a);

    a.click();

    a.remove();

    URL.revokeObjectURL(url);

  }

}





/* ═══════════════════════════════════
   PARSERS
═══════════════════════════════════ */

function parseTBL(buffer){

  const view = new DataView(buffer);

  const magic = decoder.decode(
    new Uint8Array(buffer, 0, 4)
  );

  if(magic !== MAGIC.TBL){
    throw new Error("Invalid TBL file");
  }

  const len = view.getUint32(4);

  const json = decoder.decode(
    new Uint8Array(buffer, 8, len)
  );

  return new Table(JSON.parse(json));

}

function parseTBLX(text, password="tbl"){

  const lines = text.split("\n");

  if(lines[0].trim() !== MAGIC.TBLX){
    throw new Error("Invalid TBLX file");
  }

  const encrypted = fromBase64(lines.slice(1).join("\n"));

  const json = xor(encrypted, password);

  return new Table(JSON.parse(json));

}





/* ═══════════════════════════════════
   AUTO PARSER
═══════════════════════════════════ */

async function openFile(file, password="tbl"){

  const name = file.name.toLowerCase();

  if(name.endsWith(".tbl")){

    const buffer = await file.arrayBuffer();

    return parseTBL(buffer);

  }

  if(name.endsWith(".tblx")){

    const text = await file.text();

    return parseTBLX(text, password);

  }

  if(name.endsWith(".tbly")){

    const zip = await JSZip.loadAsync(file);

    const tblx = await zip.file("table.tblx").async("string");

    return parseTBLX(tblx, password);

  }

  throw new Error("Unsupported file type");

}





/* ═══════════════════════════════════
   EXPORT
═══════════════════════════════════ */

global.TBL = {

  version: VERSION,

  TYPES,

  Table,

  parseTBL,
  parseTBLX,

  openFile

};

})(window);