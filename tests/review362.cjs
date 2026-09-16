const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:900}});
 await p.goto('http://127.0.0.1:5173');await p.evaluate(()=>document.fonts.ready);
 const g=p.locator('.objects-gallery');
 for(const leave of [false,true]){
  await p.setViewportSize({width:1920,height:900});await g.scrollIntoViewIfNeeded();await p.waitForTimeout(100);
  const r=await g.boundingBox();await p.mouse.move(r.x+r.width-8,r.y+100);if(leave)await p.mouse.move(1,1);
  await p.setViewportSize({width:1280,height:900});await p.waitForTimeout(100);
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),'stale cursor overflow');
 }
 for(const width of [1920,1440,1280,1024,768,550,390,320]){
  await p.setViewportSize({width,height:900});await p.waitForTimeout(100);
  const data=await p.evaluate(()=>{
   const r=e=>e.getBoundingClientRect(),s=e=>getComputedStyle(e);
   const button=document.querySelector('.price-panel>.button'),panel=document.querySelector('.price-panel');
   return {labels:[...document.querySelectorAll('.path-label')].map(e=>({overflow:s(e).overflow,max:s(e).maxHeight,height:e.clientHeight,scroll:e.scrollHeight})),
    wrap:[...document.querySelectorAll('.featured-object h3')].every(e=>s(e).whiteSpace==='normal'&&e.scrollWidth<=e.clientWidth+1),
    indent:parseFloat(s(document.querySelector('.service-grid li:nth-child(2)')).paddingTop),
    left:r(button).left-r(panel).left,
    imgs:[...document.querySelectorAll('.social-list article>img')].map(e=>({width:r(e).width,col:parseFloat(s(e.parentElement).gridTemplateColumns),height:r(e).height})),
    overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1};
  });
  assert(!data.overflow,`${width} page overflow`);assert(data.wrap,`${width} caption wrap`);
  data.labels.forEach(l=>assert(l.overflow==='visible'&&l.max==='none'&&l.scroll<=l.height+1,'label clipping'));
  data.imgs.forEach(i=>assert(Math.abs(i.width-i.col)<1&&i.height>0,'full image column'));
  if(width<=1440)assert(data.indent>0,'even stagger');if(width<=1024)assert(Math.abs(data.left)<1,'left CTA');
 }
 await p.locator('.social-list').screenshot({path:'/home/user/reference/social362-320.png'});
 await b.close();console.log('PASS: cursor hover/leave + resize regression, unclipped labels, wrapped object headings, full-width social images, even-item stagger, left CTA at 8 widths.');
})().catch(e=>{console.error(e);process.exit(1)});
