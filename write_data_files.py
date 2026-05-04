import json

# Loop events data
events = {
    "3_1": {
        "npcName": "🎪",
        "text": "校庆的烟花绽放在夜空中，你被推上了舞台中央……「接下来，请欣赏校庆特别演出！」",
        "playerText": "这可是我的高光时刻！",
        "goldReward": 50,
        "energyReward": 10
    },
    "5_0": {
        "npcName": "🏅",
        "text": "合宿第一天，体育老师吹响了哨声——「运动会正式开始！各就各位！」阳光、汗水和欢笑交织在一起。",
        "playerText": "全力以赴！",
        "goldReward": 40,
        "energyReward": 15
    },
    "7_0": {
        "npcName": "✈️",
        "text": "修学旅行的列车缓缓驶出站台，同学们兴奋地讨论着目的地。「这次旅行一定会成为最好的回忆！」",
        "playerText": "出发吧！新的冒险在等着我们！",
        "diamondReward": 3,
        "energyReward": 20
    },
    "6_2": {
        "npcName": "🎭",
        "text": "文化祭的话剧排练进入了最终冲刺，你被选为主角。「准备好了吗？大幕即将拉开！」",
        "playerText": "台上一分钟，台下十年功！",
        "goldReward": 60,
        "diamondReward": 2
    },
    "4_1": {
        "npcName": "📚",
        "text": "期末考试周来临，图书馆里座无虚席。学妹悄悄递来一杯热可可——「学姐加油，你一定可以的！」",
        "playerText": "温暖的力量……我一定不会让大家失望！",
        "goldReward": 30,
        "energyReward": 15
    }
}

with open('assets/data/loop_events.json', 'w', encoding='utf-8') as f:
    json.dump(events, f, ensure_ascii=False, indent=4)
print('Done: loop_events.json written')

# Extended loop narratives (Loop 1-8)
narratives = {
    "1": {
        "loopIntro": "新学期开始了，一切从零出发……",
        "loopOutro": "你完成了第一次试炼，新的篇章即将展开！",
        "boss_0": {"intro": None, "defeatOutro": None},
        "boss_1": {"intro": None, "defeatOutro": None},
        "boss_2": {"intro": None, "defeatOutro": None},
        "boss_3": {"intro": None, "defeatOutro": None}
    },
    "2": {
        "loopIntro": "第二学期开始了，熟悉的校园似乎有了微妙的变化……",
        "loopOutro": "第二次通关！你的名声在校园里传开了。",
        "boss_0": {"intro": "「又见面了呢，这次我可不会手下留情。」", "defeatOutro": "「你变强了呢……」"},
        "boss_1": {"intro": "「第二轮了，准备好了吗？」", "defeatOutro": "「果然，还是挡不住你……」"},
        "boss_2": {"intro": "「Welcome back! Ready for round 2?」", "defeatOutro": "「Impressive... again.」"},
        "boss_3": {"intro": "「第二次了？让我看看你的成长。」", "defeatOutro": "「看来，你是认真的……」"}
    },
    "3": {
        "loopIntro": "校庆的热闹氛围中，新的挑战悄然而至……",
        "loopOutro": "校庆之星！你的传说在校园里无人不知！",
        "boss_0": {"intro": "「校庆快乐！来场特别的约会吧？」", "defeatOutro": "「这是我最好的校庆礼物……」"},
        "boss_1": {"intro": "「校庆的比赛，我可是认真的！」", "defeatOutro": "「输给你……也算一种庆祝吧。」"},
        "boss_2": {"intro": "「School festival! Let's make it unforgettable!」", "defeatOutro": "「You made this festival truly special.」"},
        "boss_3": {"intro": "「校庆的舞台上，让我考验你。」", "defeatOutro": "「你已成为这所学园的传奇……」"}
    },
    "4": {
        "loopIntro": "期末的风暴来临，真正的考验才刚开始……",
        "loopOutro": "期末通关！连最严格的考官也对你刮目相看！",
        "boss_0": {"intro": "「这次考试，你能拿几分？」", "defeatOutro": "「满分……你总是让人意外。」"},
        "boss_1": {"intro": "「期末特训，开始！」", "defeatOutro": "「你的进步超乎想象……」"},
        "boss_2": {"intro": "「Final exam! No shortcuts this time!」", "defeatOutro": "「A+! You've earned it.」"},
        "boss_3": {"intro": "「期末的最终考验，准备好了吗？」", "defeatOutro": "「你已超越了这所学园的一切……」"}
    },
    "5": {
        "loopIntro": "夏日的合宿，阳光与汗水交织的新篇章……",
        "loopOutro": "合宿归来，你已是无可争议的女王！",
        "boss_0": {"intro": "「合宿的夜晚，来散个步？」", "defeatOutro": "「和你一起看的星星，最亮……」"},
        "boss_1": {"intro": "「合宿训练，没有退路！」", "defeatOutro": "「你的意志……比钢铁还强……」"},
        "boss_2": {"intro": "「Summer camp! This is where legends are made!」", "defeatOutro": "「You're the camp MVP, without question.」"},
        "boss_3": {"intro": "「合宿的最终夜，让我看看你的全部。」", "defeatOutro": "「你已经是……超越一切的存在。」"}
    },
    "6": {
        "loopIntro": "文化祭的帷幕拉开，每个人都期待着你的表演……",
        "loopOutro": "文化祭的女主角！你的表演惊艳了全场！",
        "boss_0": {"intro": "「文化祭的序幕，由我揭开。」", "defeatOutro": "「你的演出……无人能及。」"},
        "boss_1": {"intro": "「舞台已经准备好了，上场吧！」", "defeatOutro": "「这一幕……将载入校史。」"},
        "boss_2": {"intro": "「Cultural festival! The stage is yours!」", "defeatOutro": "「A standing ovation! You've earned it.」"},
        "boss_3": {"intro": "「文化祭的终幕，请接受我的谢幕。」", "defeatOutro": "「你才是这所学园永恒的主角……」"}
    },
    "7": {
        "loopIntro": "修学旅行的列车，驶向未知的冒险……",
        "loopOutro": "旅行归来，你已成为所有人心中最特别的存在！",
        "boss_0": {"intro": "「旅行中最美的风景，是你。」", "defeatOutro": "「这段旅程因你而完美……」"},
        "boss_1": {"intro": "「修学旅行的考验，从这里开始！」", "defeatOutro": "「你的勇气照亮了整个旅途……」"},
        "boss_2": {"intro": "「School trip! Adventure awaits around every corner!」", "defeatOutro": "「You made this trip unforgettable.」"},
        "boss_3": {"intro": "「归途的夕阳下，让我向你告别。」", "defeatOutro": "「无论走到哪里，你都是我们的光……」"}
    },
    "8": {
        "loopIntro": "毕业前的最后一个夜晚，所有的回忆如走马灯般闪过……",
        "loopOutro": "毕业不是终点，而是新的起点。你已成为这所学园永恒的传说！",
        "boss_0": {"intro": "「毕业前夜……你有话想对我说吗？」", "defeatOutro": "「谢谢你，这三年因你而精彩……」"},
        "boss_1": {"intro": "「最后的挑战，不留遗憾！」", "defeatOutro": "「这就是你的毕业答卷……满分。」"},
        "boss_2": {"intro": "「Graduation night! Let's make it one to remember!」", "defeatOutro": "「You'll always be our brightest star.」"},
        "boss_3": {"intro": "「毕业典礼的钟声即将响起……让我为你送行。」", "defeatOutro": "「再见了……我永远的学园女王……」"}
    }
}

with open('assets/data/loop_narratives.json', 'w', encoding='utf-8') as f:
    json.dump(narratives, f, ensure_ascii=False, indent=4)
print('Done: loop_narratives.json written with Loop 1-8')