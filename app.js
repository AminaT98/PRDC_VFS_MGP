const $ = id => document.getElementById(id);
const CATEGORY_FIELD = "Dans le cadre du mécanisme de gestion des plaintes (MGP), quel volet souhaitez-vous documenter ?";
const CATEGORIES = [
 "Comités de gestion des plaintes",
 "Réclamations enregistrées et traitement",
 "Appréciation communautaire du mécanisme"
];
const COLORS = {
 "Comités de gestion des plaintes":"#309329",
 "Réclamations enregistrées et traitement":"#d39a24",
 "Appréciation communautaire du mécanisme":"#277da1"
};
let records=[], activeCategory="all", filtered=[], map=null, selectedId=null, didInitialFit=false;
function esc(v){return String(v??"—").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function norm(s){return String(s??"").trim().toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"'")}
function cleanLabel(s){
 let x=String(s??"").replace(/\s+/g," ").trim();
 // Remove numbered question prefixes, including "1.", "2 -", "(3)", "[4]"
 x=x.replace(/^\s*(?:\[\s*\d+\s*\]|\(\s*\d+\s*\)|\d+)\s*(?:[.)\-:]\s*|\s+)/,"").trim();
 return x;
}
function isHiddenField(key){
 const k=String(key??"").trim(), n=norm(k);
 return !k || k==="start" || k==="end" || k.startsWith("_") || n.startsWith("meta/") ||
   k.includes("/") || n==="nom de l'enqueteur" || n===norm(CATEGORY_FIELD) ||
   n==="coordonne gps" || n.includes("latitude") || n.includes("longitude") ||
   n.includes("altitude") || n.includes("precision gps");
}
function validGPS(r){
 return Number.isFinite(r.lat)&&Number.isFinite(r.lon)&&Math.abs(r.lat)<=90&&Math.abs(r.lon)<=180&&!(r.lat===0&&r.lon===0);
}
function getFiltered(){
 const q=$("search").value.toLocaleLowerCase("fr").trim(), w=$("wilaya").value, t=$("type").value;
 return records.filter(r=>(activeCategory==="all"||r.category===activeCategory)&&
  (!q||[r.category,r.wilaya,r.moughataa,r.commune,r.village,...Object.values(r.fields)].join(" ").toLocaleLowerCase("fr").includes(q))&&
  (!w||r.wilaya===w)&&(!t||r.complaintType===t));
}
function refreshOptions(){
 const keepW=$("wilaya").value, keepT=$("type").value;
 const subset=records.filter(r=>activeCategory==="all"||r.category===activeCategory);
 const wilayas=[...new Set(subset.map(r=>r.wilaya).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr"));
 const types=[...new Set(subset.map(r=>r.complaintType).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr"));
 $("wilaya").innerHTML='<option value="">Toutes les wilayas</option>'+wilayas.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("");
 $("type").innerHTML='<option value="">Tous les types de réclamation</option>'+types.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("");
 if(wilayas.includes(keepW))$("wilaya").value=keepW;
 if(types.includes(keepT))$("type").value=keepT;
 $("type").disabled=types.length===0;
}
function renderStats(rs){
 const gps=rs.filter(validGPS).length, wilayas=new Set(rs.map(r=>r.wilaya).filter(Boolean)).size;
 const stats=[
  ["Enregistrements",rs.length,"Dans la sélection actuelle"],
  ["Avec coordonnées GPS",gps,rs.length?Math.round(gps/rs.length*100)+" % géolocalisés":"Aucune donnée"],
  ["Wilayas couvertes",wilayas,"Dans la sélection actuelle"],
  ["Volets documentés",new Set(rs.map(r=>r.category).filter(Boolean)).size,"Sur 3 volets du MGP"]
 ];
 $("stats").innerHTML=stats.map(x=>'<div class="stat"><div class="statlabel">'+x[0]+'</div><div class="num">'+x[1]+'</div><div class="hint">'+x[2]+'</div></div>').join("");
 document.querySelectorAll(".category-btn").forEach(b=>{
  const c=b.dataset.category;
  const count=c==="all"?records.length:records.filter(r=>r.category===c).length;
  const label=c==="all"?"Tous les volets":c;
  b.innerHTML=esc(label)+'<span class="count">'+count+' enregistrement(s)</span>';
 });
}
function renderDetails(r){
 const status=$("detail-status"), title=$("detail-title");
 if(!r){
  $("details").innerHTML='<div class="empty">Cliquez sur un point de la carte pour afficher la fiche correspondante.</div>';
  status.textContent="Sélectionnez un point sur la carte";
  title.textContent="Fiche du mécanisme de gestion des plaintes";
  return;
 }
 title.textContent=r.village||r.commune||r.category||"Fiche MGP";
 status.textContent=validGPS(r)?"Point GPS affiché sur la carte":"Coordonnées GPS non disponibles";
 const values=[
  ["Volet MGP",r.category],["Wilaya",r.wilaya],["Moughataa",r.moughataa],
  ["Commune",r.commune],["Village/Localité",r.village]
 ];
 let h='<div class="record-detail"><div class="fieldgrid">';
 h+=values.map(([k,v])=>'<div class="field"><b>'+esc(k)+'</b><span>'+esc(v||"—")+'</span></div>').join("");
 h+='</div>';
 const extras=Object.entries(r.fields).filter(([k,v])=>!isHiddenField(k)&&v!==null&&v!==undefined&&String(v).trim()!=="");
 if(extras.length){
  h+='<button type="button" class="btn secondary see-more-btn" id="see-more-btn" aria-expanded="false">Voir plus de détails <span aria-hidden="true">＋</span></button>';
  h+='<div class="all-data hidden" id="all-data"><h3 class="photos-title">Informations détaillées</h3><div class="fieldgrid">';
  h+=extras.map(([k,v])=>'<div class="field"><b>'+esc(cleanLabel(k))+'</b><span>'+esc(typeof v==="object"?JSON.stringify(v):v)+'</span></div>').join("");
  h+='</div></div>';
 }
 h+='</div>';$("details").innerHTML=h;
 const more=$("see-more-btn"), all=$("all-data");
 if(more&&all)more.addEventListener("click",()=>{
  const open=all.classList.toggle("hidden")===false;
  more.setAttribute("aria-expanded",open?"true":"false");
  more.innerHTML=open?'Voir moins <span aria-hidden="true">−</span>':'Voir plus de détails <span aria-hidden="true">＋</span>';
 });
}
function updateMap(rs){
 if(!map)return;
 const features=rs.filter(validGPS).map(r=>({type:"Feature",geometry:{type:"Point",coordinates:[r.lon,r.lat]},properties:{id:r.id,category:r.category,label:r.village||r.commune||r.wilaya,color:COLORS[r.category]||"#309329"}}));
 const source=map.getSource("mgp-records");
 if(source){
  source.setData({type:"FeatureCollection",features});
  if(features.length&&!didInitialFit){
   const bounds=new maplibregl.LngLatBounds();features.forEach(f=>bounds.extend(f.geometry.coordinates));
   map.fitBounds(bounds,{padding:55,maxZoom:8,duration:0});didInitialFit=true;
  }
 }
 $("map-count").textContent=features.length+" point(s) GPS";
}
function render(){
 refreshOptions();
 filtered=getFiltered();
 renderStats(filtered);
 updateMap(filtered);
 if(selectedId){
  const r=records.find(x=>x.id===selectedId);
  if(r&&filtered.some(x=>x.id===selectedId))renderDetails(r);
  else{selectedId=null;renderDetails(null)}
 }else renderDetails(null);
}
function initMap(){
 if(!window.maplibregl){$("map").innerHTML='<div class="empty">La bibliothèque cartographique n’a pas pu être chargée. Vérifiez votre connexion.</div>';return}
 map=new maplibregl.Map({container:"map",style:"https://tiles.openfreemap.org/styles/positron",center:[-12.5,16],zoom:5.3});
 map.addControl(new maplibregl.NavigationControl(),"top-right");
 map.on("load",()=>{
  map.addSource("mgp-records",{type:"geojson",data:{type:"FeatureCollection",features:[]}});
  map.addLayer({id:"mgp-points",type:"circle",source:"mgp-records",paint:{"circle-color":["get","color"],"circle-radius":8,"circle-stroke-color":"#fff","circle-stroke-width":2,"circle-opacity":.95}});
  map.on("click","mgp-points",e=>{
   const f=e.features&&e.features[0];if(!f)return;
   const id=String(f.properties.id), r=records.find(x=>x.id===id);if(!r)return;
   selectedId=id;renderDetails(r);
   new maplibregl.Popup({offset:12,maxWidth:"290px"}).setLngLat(f.geometry.coordinates)
    .setHTML("<b>"+esc(f.properties.label)+"</b><br><span>"+esc(f.properties.category)+"</span>").addTo(map);
  });
  map.on("mouseenter","mgp-points",()=>map.getCanvas().style.cursor="pointer");
  map.on("mouseleave","mgp-points",()=>map.getCanvas().style.cursor="");
  map.resize();updateMap(getFiltered());
 });
 map.on("error",e=>{
  const status=$("load-status");
  if(status&&e?.error){status.className="load-status error";status.textContent="Erreur cartographique : "+(e.error.message||"impossible de charger le fond de carte. Vérifiez la connexion Internet.")}
 });
}
async function loadWorkbook(){
 const status=$("load-status");
 if(!window.XLSX){status.className="load-status error";status.textContent="La bibliothèque Excel n’a pas pu être chargée. Vérifiez votre connexion.";return}
 if(location.protocol==="file:"){
  status.className="load-status error";
  status.textContent="Pour charger automatiquement les données, ouvrez ce tableau de bord avec le fichier Ouvrir_Tableau_MGP.bat. Le navigateur bloque la lecture des fichiers Excel par double-clic sur le HTML.";
  return;
 }
 try{
  const response=await fetch("Gestion_des_plaintes_MGP.xlsx",{cache:"no-store"});
  if(!response.ok)throw new Error("Fichier Excel introuvable (HTTP "+response.status+").");
  const wb=XLSX.read(await response.arrayBuffer(),{type:"array",cellDates:true});
  const sheet=wb.SheetNames.find(n=>!/^photo/i.test(n))||wb.SheetNames[0];
  const rows=XLSX.utils.sheet_to_json(wb.Sheets[sheet],{defval:null,raw:false});
  records=rows.map((row,i)=>{
   const fields={};for(const [k,v] of Object.entries(row))if(v!==null&&v!==undefined&&String(v).trim()!=="")fields[k]=v instanceof Date?v.toISOString().slice(0,10):v;
   const pick=(...keys)=>{for(const k of keys)if(fields[k]!==undefined&&String(fields[k]).trim()!=="")return fields[k];return null};
   const lat=Number(String(pick("_Coordonnée GPS_latitude")??"").replace(",","."));
   const lon=Number(String(pick("_Coordonnée GPS_longitude")??"").replace(",","."));
   const id=String(pick("_id")||("mgp-"+(i+1)));
   const village=pick("Village/Localité :","Village/Localité","Village","Localité");
   return {id,category:String(pick(CATEGORY_FIELD)||"Volet non précisé"),wilaya:String(pick("Wilaya")||"Non renseigné"),
    moughataa:pick("Moughataa"),commune:pick("Commune"),village:village?String(village).trim():null,
    complaintType:pick("1. Type de réclamation enregistrée","Type de réclamation enregistrée"),
    lat:Number.isFinite(lat)?lat:null,lon:Number.isFinite(lon)?lon:null,fields};
  });
  render();
  const counts=CATEGORIES.map(c=>records.filter(r=>r.category===c).length);
  status.className="load-status success";
  status.textContent="Données MGP chargées : "+records.length+" enregistrement(s).";
 }catch(e){status.className="load-status error";status.textContent="Impossible de charger les données MGP : "+(e.message||"erreur de lecture du fichier Excel");}
}
document.querySelectorAll(".category-btn").forEach(b=>b.addEventListener("click",()=>{
 activeCategory=b.dataset.category;
 document.querySelectorAll(".category-btn").forEach(x=>{const on=x===b;x.classList.toggle("active",on);x.setAttribute("aria-pressed",on?"true":"false")});
 selectedId=null;render();
}));
["search","wilaya","type"].forEach(id=>$(id).addEventListener(id==="search"?"input":"change",()=>{selectedId=null;render()}));
render();initMap();loadWorkbook();
