const $ = id => document.getElementById(id);
const board = $('board');

let catalog, state, revision = 0, ready = false;
const rgb = hex => hex.match(/[a-f\d]{2}/gi).map(v => parseInt(v,16));
const luminance = c => c.map(v => {v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const contrast = (a,b) => (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
const inBox = (x,y,[a,b,w,h]) => x>=a && x<a+w && y>=b && y<b+h;
const inside = (x,y,boxes) => boxes.some(box=>inBox(x,y,box));
function controls(){
 for(const color of catalog.colors){
  const b=document.createElement('button');b.className='color';b.style.setProperty('--swatch',color.hex);b.style.setProperty('--check',luminance(rgb(color.hex))>.4?'#142b49':'white');b.title=`${color.id} ${color.name}`;b.setAttribute('aria-label',b.title);b.innerHTML=`<i aria-hidden="true"></i><span>${color.id} ${color.name}</span>`;b.dataset.id=color.id;b.onclick=()=>{state.color=color.id;render()};$('colors').append(b);
 }
 for(const style of catalog.styles){
  const b=document.createElement('button');b.className='style';b.dataset.id=style.id;b.innerHTML=`<strong>${style.label}</strong><span>${style.name}<small>${style.description}</small></span>`;b.onclick=()=>{state.style=style.id;render()};$('styles').append(b);
 }
 for(const g of catalog.garments){const b=document.createElement('button');b.className='garment secondary';b.dataset.id=g.id;b.textContent=g.name;b.onclick=()=>{state.garment=g.id;render()};$('garments').append(b);}
 $('style-count').textContent=`${catalog.styles.length} 款可預覽`;
}
function label(){
 const color=catalog.colors.find(c=>c.id===state.color),style=catalog.styles.find(s=>s.id===state.style);
 const garment=catalog.garments.find(g=>g.id===state.garment), asset=style.previews[garment.id][color.id];
 return {color,style,garment,asset,text:`${style.label}｜${style.name} · ${color.id} ${color.name} · ${garment.name}`};
}
async function render(){
 const token=++revision;ready=false;
 $('download').disabled=$('zoom').disabled=true;$('loading').hidden=false;$('retry').hidden=true;
 board.hidden=true;if($('lightbox').open)$('lightbox').close();
 const {style,color,text,asset}=label();
 $('selection').textContent=text;$('color-label').textContent=`${color.id} ${color.name}`;$('description').textContent=style.description;
 document.querySelectorAll('.color').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===state.color)));
 document.querySelectorAll('.style').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===state.style)));
 document.querySelectorAll('.garment').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===state.garment)));
 $('status').textContent='正在載入搭配圖…';
 try{
  const url=asset?.url;if(!url)throw Error('缺少配色圖片');
  const img=new Image();img.src=url;await img.decode();if(token!==revision)return;
  if(img.naturalWidth!==asset.width||img.naturalHeight!==asset.height)throw Error('圖片尺寸不符');
  board.width=asset.width;board.height=asset.height;board.parentElement.style.aspectRatio=`${asset.width}/${asset.height}`;board.src=url;board.alt=`${text}，男女正面、背面與放大展示`;board.hidden=false;
  $('loading').hidden=true;$('download').disabled=$('zoom').disabled=false;
  $('status').textContent=`男女正面・背面・放大展示 / ${asset.width} × ${asset.height} PNG`;ready=true;
 }catch(e){if(token!==revision)return;$('loading').hidden=true;board.removeAttribute('src');$('status').textContent='圖片載入失敗，請重新載入。';$('retry').hidden=false;}
}
$('zoom').onclick=()=>{if(!ready)return;$('large').width=board.width;$('large').height=board.height;$('large').style.width=board.width+'px';$('large').src=board.src;$('large').alt=board.alt;$('zoom-label').textContent=label().text;$('lightbox').showModal()};
$('close').onclick=()=>$('lightbox').close();$('retry').onclick=()=>render();
$('download').onclick=()=>{if(!ready)return;const {style,color,garment,asset}=label(),a=document.createElement('a');a.href=asset.url;a.download=`CHT_${style.label}_${style.name}_${color.id}_${color.name}_${garment.name}.png`;a.click()};
try{
 const response=await fetch('catalog.json',{cache:'no-store'});if(!response.ok)throw Error('catalog');
 catalog=await response.json();state={color:'23',style:'B',garment:'tshirt'};controls();await render();
 window.configurator={catalog,get state(){return {...state}},get ready(){return ready},select:async(style,color,garment=state.garment)=>{
  if(!catalog.garments.some(g=>g.id===garment)||!catalog.styles.some(s=>s.id===style)||!catalog.colors.some(c=>c.id===color))throw Error('無效組合');state={style,color,garment};await render();
 }};
}catch(e){$('loading').textContent='無法讀取設定，請重新整理頁面。';$('status').textContent='請透過本機 HTTP 伺服器開啟。'}
