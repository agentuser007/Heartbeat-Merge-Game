import json

data = {
    "orderPool": [
        {"id": "daily_1", "name": "同学借笔记", "required": [{"itemId": "study_2", "count": 1}], "goldReward": 15, "minLoop": 1, "dialogue": "谢谢你的笔记！考试有救了！"},
        {"id": "daily_2", "name": "闺蜜要巧克力", "required": [{"itemId": "food_2", "count": 1}], "goldReward": 15, "minLoop": 1, "dialogue": "巧克力！你最懂我了~ 💕"},
        {"id": "daily_3", "name": "学妹求唇膏", "required": [{"itemId": "lip_2", "count": 1}], "goldReward": 15, "minLoop": 1, "dialogue": "学姐的唇膏颜色好好看！"},
        {"id": "daily_4", "name": "室友借香水", "required": [{"itemId": "perf_2", "count": 1}], "goldReward": 15, "minLoop": 1, "dialogue": "这个味道好清新呀，谢谢！"},
        {"id": "daily_5", "name": "老师要资料", "required": [{"itemId": "study_3", "count": 1}], "goldReward": 30, "minLoop": 1, "dialogue": "整理得很仔细，做得好！"},
        {"id": "daily_6", "name": "社团聚餐", "required": [{"itemId": "food_3", "count": 1}], "goldReward": 30, "minLoop": 1, "dialogue": "这饮料太赞了！干杯！🥂"},
        {"id": "daily_7", "name": "学姐化妆", "required": [{"itemId": "lip_3", "count": 1}], "goldReward": 30, "minLoop": 1, "dialogue": "这色号绝了！约会必备！💄"},
        {"id": "daily_8", "name": "晚会调香", "required": [{"itemId": "perf_3", "count": 1}], "goldReward": 30, "minLoop": 1, "dialogue": "全场最香的就是你！🌸"},
        {"id": "daily_9", "name": "双人份笔记", "required": [{"itemId": "study_2", "count": 2}], "goldReward": 25, "minLoop": 1, "dialogue": "两份都要！我和同桌一人一份！"},
        {"id": "daily_10", "name": "下午茶时间", "required": [{"itemId": "food_2", "count": 1}, {"itemId": "lip_2", "count": 1}], "goldReward": 25, "minLoop": 1, "dialogue": "吃完涂个唇膏，完美下午茶~ ☕"},
        {"id": "daily_11", "name": "约会全套", "required": [{"itemId": "lip_2", "count": 1}, {"itemId": "perf_2", "count": 1}], "goldReward": 25, "minLoop": 1, "dialogue": "有了这些约会稳了！谢谢学姐！"},
        {"id": "daily_12", "name": "考前突击", "required": [{"itemId": "study_2", "count": 1}, {"itemId": "food_2", "count": 1}], "goldReward": 25, "minLoop": 1, "dialogue": "边吃边学，效率翻倍！📖"},
        {"id": "daily_13", "name": "满分冲刺", "required": [{"itemId": "study_4", "count": 1}], "goldReward": 60, "minLoop": 2, "dialogue": "满分试卷！你是我的神！🙏"},
        {"id": "daily_14", "name": "约会便当", "required": [{"itemId": "food_4", "count": 1}], "goldReward": 60, "minLoop": 2, "dialogue": "爱心便当！太幸福了~ 💕🍱"},
        {"id": "daily_15", "name": "口红控的收藏", "required": [{"itemId": "lip_4", "count": 1}], "goldReward": 60, "minLoop": 2, "dialogue": "丝绒口红！这也太高级了吧！💄✨"},
        {"id": "daily_16", "name": "香水达人", "required": [{"itemId": "perf_4", "count": 1}], "goldReward": 60, "minLoop": 2, "dialogue": "斩男迷香！闻到就心动！💐"},
        {"id": "daily_17", "name": "学霸养成", "required": [{"itemId": "study_4", "count": 1}, {"itemId": "food_3", "count": 1}], "goldReward": 80, "minLoop": 2, "dialogue": "满分试卷+能量特饮=无敌组合！💪"},
        {"id": "daily_18", "name": "美妆博主", "required": [{"itemId": "lip_4", "count": 1}, {"itemId": "perf_3", "count": 1}], "goldReward": 80, "minLoop": 2, "dialogue": "这搭配绝了！美妆博主就是你！📸"},
        {"id": "daily_19", "name": "浪漫晚餐", "required": [{"itemId": "food_4", "count": 1}, {"itemId": "perf_4", "count": 1}], "goldReward": 80, "minLoop": 2, "dialogue": "便当配香水，浪漫满分！🌙"},
        {"id": "daily_20", "name": "推荐信请求", "required": [{"itemId": "study_5", "count": 1}], "goldReward": 120, "minLoop": 3, "dialogue": "保送推荐信！学姐你太强了！🏆"},
        {"id": "daily_21", "name": "贵妇下午茶", "required": [{"itemId": "food_5", "count": 1}], "goldReward": 120, "minLoop": 3, "dialogue": "满汉全席食盒！这也太奢侈了！🎁"},
        {"id": "daily_22", "name": "女王气场", "required": [{"itemId": "lip_5", "count": 1}], "goldReward": 120, "minLoop": 3, "dialogue": "气质女王唇色！气场两米八！❤️‍🔥"},
        {"id": "daily_23", "name": "致命诱惑", "required": [{"itemId": "perf_5", "count": 1}], "goldReward": 120, "minLoop": 3, "dialogue": "致命费洛蒙……我好像被迷住了💜"},
        {"id": "daily_24", "name": "学术巅峰", "required": [{"itemId": "study_6", "count": 1}], "goldReward": 250, "minLoop": 4, "dialogue": "学术论文！这是天才级别的！📜✨"},
        {"id": "daily_25", "name": "星级晚宴", "required": [{"itemId": "food_6", "count": 1}], "goldReward": 250, "minLoop": 4, "dialogue": "米其林晚宴！这排面绝了！🍷"},
        {"id": "daily_26", "name": "倾城一吻", "required": [{"itemId": "lip_6", "count": 1}], "goldReward": 250, "minLoop": 4, "dialogue": "倾城之吻……这谁顶得住啊！💋"},
        {"id": "daily_27", "name": "月下漫步", "required": [{"itemId": "perf_6", "count": 1}], "goldReward": 250, "minLoop": 4, "dialogue": "月下迷雾……像在梦里一样🌙"},
        {"id": "daily_28", "name": "全能女王", "required": [{"itemId": "study_5", "count": 1}, {"itemId": "lip_5", "count": 1}, {"itemId": "food_5", "count": 1}], "goldReward": 300, "minLoop": 4, "dialogue": "学才艺美貌全都有！女王驾到！👑"},
        {"id": "daily_29", "name": "考试周补给", "required": [{"itemId": "study_3", "count": 1}, {"itemId": "food_3", "count": 1}], "goldReward": 50, "minLoop": 2, "dialogue": "考试周就靠你了！笔记+零食=通关秘籍！📚"},
        {"id": "daily_30", "name": "约会大作战", "required": [{"itemId": "lip_3", "count": 1}, {"itemId": "perf_3", "count": 1}], "goldReward": 50, "minLoop": 2, "dialogue": "唇膏配香水，约会必胜！💘"},
        {"id": "daily_31", "name": "社团招新", "required": [{"itemId": "study_3", "count": 2}], "goldReward": 55, "minLoop": 2, "dialogue": "两份招新资料，完美！我们社团就靠你了！✨"},
        {"id": "daily_32", "name": "学姐的私房课", "required": [{"itemId": "study_4", "count": 1}, {"itemId": "lip_3", "count": 1}], "goldReward": 75, "minLoop": 3, "dialogue": "学霸+美妆，学姐的私房课太值了！🎓💄"},
        {"id": "daily_33", "name": "校花选拔", "required": [{"itemId": "lip_4", "count": 1}, {"itemId": "perf_4", "count": 1}, {"itemId": "food_3", "count": 1}], "goldReward": 120, "minLoop": 3, "dialogue": "才貌双全！校花非你莫属！🌸👑"},
        {"id": "daily_34", "name": "期末突击队", "required": [{"itemId": "study_4", "count": 2}], "goldReward": 110, "minLoop": 3, "dialogue": "双倍满分！突击队长的实力！📝📝"},
        {"id": "daily_35", "name": "名媛下午茶", "required": [{"itemId": "food_5", "count": 1}, {"itemId": "perf_5", "count": 1}], "goldReward": 200, "minLoop": 4, "dialogue": "顶级下午茶+致命香水……名媛本媛！🫖✨"},
        {"id": "daily_36", "name": "学术双修", "required": [{"itemId": "study_5", "count": 1}, {"itemId": "study_4", "count": 1}], "goldReward": 180, "minLoop": 4, "dialogue": "论文+满分试卷！学神降临！📖🔥"},
        {"id": "daily_37", "name": "终极女王套餐", "required": [{"itemId": "study_5", "count": 1}, {"itemId": "lip_5", "count": 1}, {"itemId": "perf_5", "count": 1}, {"itemId": "food_5", "count": 1}], "goldReward": 400, "minLoop": 5, "dialogue": "四项全能！这就是终极女王的实力！👑🔥"},
        {"id": "daily_38", "name": "传说之吻", "required": [{"itemId": "lip_6", "count": 1}, {"itemId": "perf_6", "count": 1}], "goldReward": 450, "minLoop": 5, "dialogue": "倾城+月下……这是传说中的心动！💋🌙"},
        {"id": "daily_39", "name": "学界传奇", "required": [{"itemId": "study_6", "count": 1}, {"itemId": "study_5", "count": 1}], "goldReward": 400, "minLoop": 5, "dialogue": "论文+推荐信……学术界的传说！📜🏆"},
        {"id": "daily_40", "name": "心动四重奏", "required": [{"itemId": "study_6", "count": 1}, {"itemId": "lip_6", "count": 1}, {"itemId": "perf_6", "count": 1}, {"itemId": "food_6", "count": 1}], "goldReward": 600, "minLoop": 6, "dialogue": "四冠加身！你已超越传说本身！💫👑"}
    ]
}

with open('assets/data/daily_orders.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=4)
print('Done: daily_orders.json written with 40 orders')