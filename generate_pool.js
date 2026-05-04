const fs = require('fs');
const path = require('path');
const pool = {
  rarityConfig:{R:{probability:0.7,color:"#4a90d9",glow:"0 0 8px #4a90d9"},SR:{probability:0.25,color:"#9b59b6",glow:"0 0 12px #9b59b6"},SSR:{probability:0.05,color:"#f1c40f",glow:"0 0 20px #f1c40f"}},
  gachaCost:{singleCost:1,tenCost:18,smallPity:50,largePity:100},
  subWeights:{R:{item:1.0},SR:{generator:0.30,joker:0.25,scissor:0.25,energy:0.20}},
  recycleEnergy:{"1":0,"2":1,"3":3,"4":6,"5":12,"6":24,"7":48,"8":96},
  fragmentToGenerator:60,fragmentToStory:60,
  chains:["lips","perfume","study","food"],
  chainNames:{lips:"唇妆",perfume:"香水",study:"学业",food:"美食"},
  chainIcons:{lips:"💄",perfume:"🧪",study:"📝",food:"🍬"},
  chainToGen:{lips:"gen_makeup",perfume:"gen_makeup",study:"gen_study",food:"gen_study"},
  chainItemPrefix:{lips:"lip",perfume:"perf",study:"study",food:"food"},
  gachaPoolV2:[]
};
const P = pool.gachaPoolV2;
const C = [
  {k:"lip",c:"lips",i:"💄",n:"唇妆",g:"gen_makeup"},
  {k:"perf",c:"perfume",i:"🧪",n:"香水",g:"gen_makeup"},
  {k:"study",c:"study",i:"📝",n:"学业",g:"gen_study"},
  {k:"food",c:"food",i:"🍬",n:"美食",g:"gen_study"}
];

// R items: 29 (Lv1-Lv5 确定性 + 惊喜盒 + 随机包 + 福袋)
for(const c of C){
  P.push({id:`r_item_${c.k}1`,rarity:"R",subCategory:"item",weight:5,icon:c.i,name:`${c.n}·Lv1`,effect:"spawn_board_item",value:{chain:c.c,level:1}});
  P.push({id:`r_item_${c.k}2`,rarity:"R",subCategory:"item",weight:4,icon:c.i,name:`${c.n}·Lv2`,effect:"spawn_board_item",value:{chain:c.c,level:2}});
  P.push({id:`r_item_${c.k}_rand12`,rarity:"R",subCategory:"item",weight:2,icon:c.i,name:`${c.n}惊喜盒·Lv1-2`,effect:"spawn_board_item",value:{chain:c.c,level:"random_1_2"}});
  P.push({id:`r_item_${c.k}3`,rarity:"R",subCategory:"item",weight:3,icon:c.i,name:`${c.n}·Lv3`,effect:"spawn_board_item",value:{chain:c.c,level:"random_3_4"}});
  P.push({id:`r_item_${c.k}4`,rarity:"R",subCategory:"item",weight:2,icon:c.i,name:`${c.n}·Lv4`,effect:"spawn_board_item",value:{chain:c.c,level:4}});
  P.push({id:`r_item_${c.k}5`,rarity:"R",subCategory:"item",weight:1,icon:c.i,name:`${c.n}·Lv5`,effect:"spawn_board_item",value:{chain:c.c,level:"random_3_5"}});
}
P.push({id:"r_item_mix_lv1",rarity:"R",subCategory:"item",weight:3,icon:"🎲",name:"随机物品·Lv1",effect:"spawn_board_item",value:{chain:"random",level:1}});
P.push({id:"r_item_mix_lv2",rarity:"R",subCategory:"item",weight:2,icon:"🎲",name:"随机物品·Lv2",effect:"spawn_board_item",value:{chain:"random",level:2}});
P.push({id:"r_item_mix1",rarity:"R",subCategory:"item",weight:2,icon:"🎲",name:"随机物品包",effect:"spawn_board_item",value:{chain:"random",level:"random_3_4"}});
P.push({id:"r_item_mix2",rarity:"R",subCategory:"item",weight:1,icon:"🎊",name:"惊喜物品包",effect:"spawn_board_item",value:{chain:"random",level:"random_3_5"}});
P.push({id:"r_item_lucky_bag",rarity:"R",subCategory:"item",weight:1,icon:"🎁",name:"心动福袋·Lv1-3",effect:"spawn_board_item",value:{chain:"random",level:"random_1_3"}});

// SR generators: 8
for(const c of C){
  P.push({id:`sr_gen_${c.k}4`,rarity:"SR",subCategory:"generator",weight:3,icon:c.i,name:`${c.n}合成器·Lv4`,effect:"place_generator",value:{genChain:c.g,level:4,cgId:null}});
  P.push({id:`sr_gen_${c.k}5`,rarity:"SR",subCategory:"generator",weight:2,icon:c.i,name:`${c.n}合成器·Lv5`,effect:"place_generator",value:{genChain:c.g,level:5,cgId:null}});
}
// SR joker + scissor: 2
P.push({id:"sr_joker",rarity:"SR",subCategory:"joker",weight:5,icon:"🃏",name:"万能百搭牌",effect:"add_joker",value:{}});
P.push({id:"sr_scissor",rarity:"SR",subCategory:"scissor",weight:5,icon:"✂️",name:"时空剪刀",effect:"add_scissor",value:{}});
// SR specials: 12
[["sr_double_gen","⚡","双倍产出卡"],["sr_energy_full","🔋","体力满血包"],["sr_clear_lv1","🧹","扫帚进阶"],["sr_reroll_1","🔄","置换卷轴小"],["sr_reroll_2","🔄","置换卷轴大"],["sr_lucky_7","🍀","幸运七号"],["sr_frag_pack","📦","碎片大礼包"],["sr_gen_refresh","🔁","合成器刷新卡"],["sr_diamond_50","💎","钻石红包"],["sr_gold_pack","💰","金币大礼包"],["sr_space_clean","🧽","空间清理器"],["sr_upgrade_1","⬆️","微型升级卡"]].forEach(s=>{
  P.push({id:s[0],rarity:"SR",subCategory:"special",weight:2,icon:s[1],name:s[2],effect:"add_joker",value:{}});
});
// SR energy: 14 (5种饮料 × 小杯/大杯 + 4种特调)
[["coffee","☕","晨间咖啡",3,10],["milktea","🧋","珍珠奶茶",3,10],["juice","🧃","鲜榨果汁",3,10],["soda","🫧","气泡水",3,10],["sport","🏃","运动饮料",3,10]].forEach(e=>{
  P.push({id:`sr_energy_${e[0]}_s`,rarity:"SR",subCategory:"energy",weight:e[3],icon:e[1],name:`${e[2]}·小杯`,effect:"add_energy_item",value:{energy:e[4]}});
  P.push({id:`sr_energy_${e[0]}_l`,rarity:"SR",subCategory:"energy",weight:1,icon:e[1],name:`${e[2]}·大杯`,effect:"add_energy_item",value:{energy:30}});
});
// SR energy XL: 4 特调
[["coffee","☕","晨间咖啡"],["milktea","🧋","珍珠奶茶"],["juice","🧃","鲜榨果汁"],["soda","🥤","气泡水"]].forEach(e=>{
  P.push({id:`sr_energy_${e[0]}_xl`,rarity:"SR",subCategory:"energy",weight:1,icon:e[1],name:`${e[2]}·特调`,effect:"add_energy_item",value:{energy:50}});
});

// SSR: 8 (4 chains × Lv6 + Lv7)
const M=["校草","体育老师","外教","校长"];
const SSR=[
  {id:"ssr_lip6",c:"lips",l:6,i:"💋",n:"倾城之吻",m:M[0]},
  {id:"ssr_lip7",c:"lips",l:7,i:"👑",n:"绝世红颜",m:M[0]},
  {id:"ssr_perf6",c:"perfume",l:6,i:"🌙",n:"月下迷雾",m:M[1]},
  {id:"ssr_perf7",c:"perfume",l:7,i:"🦋",n:"永夜幽香",m:M[1]},
  {id:"ssr_study6",c:"study",l:6,i:"📜",n:"学术论文",m:M[2]},
  {id:"ssr_study7",c:"study",l:7,i:"🎓",n:"天才学者",m:M[2]},
  {id:"ssr_food6",c:"food",l:6,i:"🍷",n:"米其林晚宴",m:M[3]},
  {id:"ssr_food7",c:"food",l:7,i:"🏮",n:"皇家御宴",m:M[3]}
];
for(const s of SSR){
  const gc=s.c==='lips'||s.c==='perfume'?'gen_makeup':'gen_study';
  P.push({id:s.id,rarity:"SSR",subCategory:"generator",weight:10,icon:s.i,name:`${s.n}·Lv${s.l}`,effect:"ssr_generator",value:{genChain:gc,level:s.l,cgId:s.id}});
}
console.log(`Total pool items: ${P.length}`);
console.log(`R: ${P.filter(i=>i.rarity==='R').length}, SR: ${P.filter(i=>i.rarity==='SR').length}, SSR: ${P.filter(i=>i.rarity==='SSR').length}`);
fs.writeFileSync(path.join(__dirname,'assets','data','gacha_pool.json'),JSON.stringify(pool,null,2));
console.log('Written to assets/data/gacha_pool.json');