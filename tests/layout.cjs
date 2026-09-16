const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({ignoreDefaultArgs:['--hide-scrollbars']});
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:5173');
 await page.evaluate(()=>document.fonts.ready);
 for(const stable of [false,true]){
  await page.evaluate(s=>document.documentElement.style.scrollbarGutter=s?'stable':'auto',stable);
  for(const width of [320,360,390,480,760,768,1024,1025,1080,1120,1139,1140,1141,1180,1200,1280,1440,1799,1800,1920]){
   await page.setViewportSize({width,height:900});
   await page.waitForTimeout(70);
   const m=await page.evaluate(()=>{
    const r=e=>e.getBoundingClientRect();
    const cards=[...document.querySelectorAll('.price-list li')];
    return {client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,edge:r(document.querySelector('.footer-cta')).right,
     copyBottom:r(document.querySelector('.hero-copy')).bottom,panelTop:r(document.querySelector('.price-panel')).top,
     cards:cards.map(e=>({x:r(e).x,y:r(e).y})),
     prices:cards.map(e=>{const p=e.querySelector('div>p'),range=document.createRange();range.selectNodeContents(p);const t=range.getBoundingClientRect();return {text:p.textContent.trim(),left:t.left,right:t.right,cardLeft:r(e).left,cardRight:r(e).right,visible:getComputedStyle(p).visibility==='visible'&&t.height>0}})};
   });
   assert(m.scroll<=m.client+1,`${width}: overflow ${JSON.stringify(m)}`);
   assert(Math.abs(m.edge-m.client)<1,`${width}: footer edge`);
   for(const p of m.prices)assert(p.visible&&p.text&&p.left>=p.cardLeft&&p.right<=p.cardRight,`${width}: price ${JSON.stringify(p)}`);
   if(width<=1024){assert(m.panelTop>=m.copyBottom);assert(m.cards[0].y===m.cards[1].y&&m.cards[2].y===m.cards[3].y&&m.cards[2].y>m.cards[0].y)}
  }
 }
 await page.setViewportSize({width:1140,height:900});
 const gallery=page.locator('.objects-gallery');
 await gallery.scrollIntoViewIfNeeded();
 const box=await gallery.boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+100);await page.mouse.down();
 for(const x of [1139,0,1139,20]){await page.mouse.move(x,box.y+10,{steps:12});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),'drag overflow')}
 await page.mouse.up();
 for(let i=0;i<25;i++) {await page.evaluate(i=>window.scrollTo(0,i*(document.documentElement.scrollHeight-innerHeight)/24),i);await page.waitForTimeout(80);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),'scroll animation overflow')}
 await browser.close();console.log('PASS: 40 width/scrollbar combinations, footer edge, all price text bounds, two-column cards, gallery drag and scroll animation overflow.');
})().catch(e=>{console.error(e);process.exit(1)});
