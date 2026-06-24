# -*- coding: utf-8 -*-
import os
import json
import glob
import re
import csv
from datetime import datetime

# Paths
MEDIA_CRAWLER_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "mediacrawler", "data", "xhs", "jsonl")
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "mediacrawler", "insight")
OUTPUT_JSON = os.path.join(OUTPUT_DIR, "xhs_mobai_insights.json")
OUTPUT_CSV = os.path.join(OUTPUT_DIR, "xhs_mobai_insights.csv")

# XHS Keyword Groups defined by Azril
XHS_GROUPS = {
    "flavor": [
        "蛋白质饮料推荐", "高蛋白饮品 好喝", "蛋白奶昔 口味", "蛋白质饮料 测评",
        "蛋白饮品 哪个好", "乳清蛋白饮料 推荐",
        "蛋白质饮料 口味推荐", "抹茶 蛋白饮料", "椰子 蛋白饮料", "芒果 蛋白饮料",
        "草莓 蛋白饮料", "蛋白饮品 水果味", "荔枝 蛋白饮品", "桃子 蛋白饮品",
        "红豆 蛋白饮品", "芋头 蛋白饮品", "巧克力 蛋白饮品", "香草 蛋白饮品",
        "燕麦 蛋白饮品", "蛋白质饮料 好喝的味道",
    ],
    "yogurt": [
        "酸奶饮料 口味推荐", "喝的酸奶 什么味道好", "高蛋白酸奶饮品 好喝",
        "乳酸菌饮料 口味", "酸奶饮品 测评", "蛋白酸奶饮料 哪个好",
        "酸奶饮料 早餐", "喝的酸奶 蛋白", "安慕希 口味 推荐", "简醇 酸奶 口味",
        "益力多 评测", "喝的酸奶 新口味", "抹茶酸奶 好喝吗", "椰子酸奶饮品", "芒果酸奶饮品",
    ],
    "pain": [
        "蛋白质饮料 难喝", "蛋白奶昔 腥味", "蛋白饮品 甜腻", "蛋白质饮料 口感差",
        "代餐饮料 缺点", "蛋白质饮料 后味", "蛋白饮料 不好喝", "蛋白粉 腥味怎么办",
        "蛋白质饮料 太甜", "蛋白饮品 粉感",
    ],
    "morning": [
        "早餐 蛋白饮品", "上班路上 代餐", "早上喝什么好", "健康早餐 饮料",
        "忙碌早晨 营养", "便携早餐 饮品", "没时间吃早饭", "早晨代替早餐 饮料",
        "上班前 喝什么", "早餐饮品推荐",
    ],
    "competitor": [
        "安慕希 高蛋白 测评", "简醇 蛋白 口味", "Fairlife 体验", "肌肉牛奶 测评",
        "雅培 营养素 口感", "佳倍有方 蛋白", "Ensure 蛋白奶昔", "蛋白饮料 哪个牌子好",
        "康师傅 蛋白饮料", "中国 高蛋白饮料 推荐",
    ],
    "occasion": [
        "健身后 蛋白饮料", "运动后 蛋白补充", "代餐 蛋白质 减脂", "蛋白质 加餐",
        "蛋白饮品 下午茶", "训练后 蛋白饮料",
    ]
}

# Filtering Keywords
PRODUCT_KEYWORDS = [
    r'rtd', r'ready-to-drink', r'ready to drink', r'instant', r'beverage', r'protein', r'energy drink', r'sports drink',
    r'即饮', r'饮料', r'饮品', r'瓶装', r'罐装', r'蛋白', r'功能饮料', r'能量饮料', r'运动饮料', r'乳清蛋白', r'胶原蛋白',
    r'minuman', r'kemasan', r'tinggi protein'
]

FLAVOR_KEYWORDS = [
    r'mango jasmine', r'芒果茉莉', r'芒果', r'茉莉', r'mango', r'jasmine',
    r'coconut milk tea', r'生椰奶茶', r'椰香奶茶', r'生椰', r'椰子', r'椰乳', r'椰汁', r'奶茶', r'coconut',
    r'osmanthus', r'桂花', r'variant c',
    r'asian herbal', r'asian floral', r'草本', r'花草茶', r'凉茶', r'人参', r'罗汉果', r'菊花', r'金银花', r'枸杞',
    r'herbal', r'floral', r'rempah'
]

SENSORY_KEYWORDS = [
    r'bitter', r'pahit', r'苦', r'苦味', r'苦涩', r'涩',
    r'aftertaste', r'后味', r'余味', r'后劲',
    r'chem', r'chemical', r'strange', r'off-note', r'weird', r'off-flavor', r'化学', r'奇怪', r'药味', r'药', r'塑料', r'金属', r'rasa aneh',
    r'masking', r'mask', r'covering', r'flavor masking', r'掩盖', r'遮蔽', r'去苦', r'防苦', r'矫味', r'掩味', r'menutupi rasa'
]

def compile_regex_list(kw_list):
    return [re.compile(pattern, re.IGNORECASE) for pattern in kw_list]

PRODUCT_REGEX = compile_regex_list(PRODUCT_KEYWORDS)
FLAVOR_REGEX = compile_regex_list(FLAVOR_KEYWORDS)
SENSORY_REGEX = compile_regex_list(SENSORY_KEYWORDS)

def check_match(text, regex_list):
    if not text:
        return False
    return any(regex.search(text) for regex in regex_list)

def extract_matched_keywords(text, regex_list):
    if not text:
        return []
    matches = []
    for regex in regex_list:
        found = regex.findall(text)
        if found:
            for f in found:
                if isinstance(f, tuple):
                    matches.extend([x for x in f if x])
                else:
                    matches.append(f)
    return list(set(matches))

def get_keyword_group(keyword):
    if not keyword:
        return "general"
    keyword = keyword.strip()
    for gname, kw_list in XHS_GROUPS.items():
        if keyword in kw_list:
            return gname
    # Fallback mappings for old keywords from previous run
    if keyword in ["即饮饮料", "蛋白饮", "芒果茉莉", "生椰奶茶", "桂花 饮料"]:
        return "flavor"
    if keyword in ["饮料 苦味", "掩盖苦味", "去苦"]:
        return "pain"
    return "general"

def main():
    print("="*60)
    print("MoBai Consumer Intelligence Filtering & Extraction Tool (Grouped)")
    print(f"Source Directory: {MEDIA_CRAWLER_DATA_DIR}")
    print("="*60)

    if not os.path.exists(MEDIA_CRAWLER_DATA_DIR):
        print(f"Error: Source directory {MEDIA_CRAWLER_DATA_DIR} does not exist.")
        return

    # Find JSONL files
    content_files = glob.glob(os.path.join(MEDIA_CRAWLER_DATA_DIR, "*contents_*.jsonl"))
    comment_files = glob.glob(os.path.join(MEDIA_CRAWLER_DATA_DIR, "*comments_*.jsonl"))

    print(f"Found {len(content_files)} post content files and {len(comment_files)} comment files.")

    posts = {}
    matched_posts = []
    matched_comments = []
    seen_post_ids = set()
    seen_comment_ids = set()

    # 1. Process Post Contents
    for file_path in content_files:
        filename = os.path.basename(file_path)
        print(f"Reading posts from {filename}...")
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    data = json.loads(line)
                    note_id = data.get("note_id")
                    title = data.get("title", "")
                    desc = data.get("desc", "")
                    source_keyword = data.get("source_keyword", "")
                    
                    posts[note_id] = {
                        "title": title,
                        "desc": desc,
                        "nickname": data.get("nickname", ""),
                        "note_url": data.get("note_url", ""),
                        "source_keyword": source_keyword
                    }

                    if note_id in seen_post_ids:
                        continue

                    # Check for matches
                    match_text = f"{title} {desc}"
                    has_prod = check_match(match_text, PRODUCT_REGEX)
                    has_flav = check_match(match_text, FLAVOR_REGEX)
                    has_sens = check_match(match_text, SENSORY_REGEX)

                    if has_prod or has_flav or has_sens:
                        matched_prod_kws = extract_matched_keywords(match_text, PRODUCT_REGEX)
                        matched_flav_kws = extract_matched_keywords(match_text, FLAVOR_REGEX)
                        matched_sens_kws = extract_matched_keywords(match_text, SENSORY_REGEX)
                        
                        group_name = get_keyword_group(source_keyword)
                        seen_post_ids.add(note_id)
                        
                        matched_posts.append({
                            "type": "post",
                            "note_id": note_id,
                            "title": title,
                            "desc": desc,
                            "nickname": data.get("nickname", ""),
                            "note_url": data.get("note_url", ""),
                            "ip_location": data.get("ip_location", ""),
                            "liked_count": data.get("liked_count", "0"),
                            "collected_count": data.get("collected_count", "0"),
                            "comment_count": data.get("comment_count", "0"),
                            "share_count": data.get("share_count", "0"),
                            "source_file": filename,
                            "source_keyword": source_keyword,
                            "group": group_name,
                            "match_categories": {
                                "product": has_prod,
                                "flavor": has_flav,
                                "sensory": has_sens
                            },
                            "matched_keywords": {
                                "product": matched_prod_kws,
                                "flavor": matched_flav_kws,
                                "sensory": matched_sens_kws
                            }
                        })
                except Exception as e:
                    print(f"Error parsing line in {filename}: {e}")

    # 2. Process Comments
    for file_path in comment_files:
        filename = os.path.basename(file_path)
        print(f"Reading comments from {filename}...")
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    data = json.loads(line)
                    comment_id = data.get("comment_id")
                    note_id = data.get("note_id")
                    content = data.get("content", "")
                    
                    if comment_id in seen_comment_ids:
                        continue
                        
                    has_prod = check_match(content, PRODUCT_REGEX)
                    has_flav = check_match(content, FLAVOR_REGEX)
                    has_sens = check_match(content, SENSORY_REGEX)

                    if has_prod or has_flav or has_sens:
                        matched_prod_kws = extract_matched_keywords(content, PRODUCT_REGEX)
                        matched_flav_kws = extract_matched_keywords(content, FLAVOR_REGEX)
                        matched_sens_kws = extract_matched_keywords(content, SENSORY_REGEX)

                        parent_post = posts.get(note_id, {})
                        source_keyword = parent_post.get("source_keyword", "")
                        group_name = get_keyword_group(source_keyword)
                        seen_comment_ids.add(comment_id)
                        
                        matched_comments.append({
                            "type": "comment",
                            "comment_id": comment_id,
                            "note_id": note_id,
                            "content": content,
                            "nickname": data.get("nickname", ""),
                            "ip_location": data.get("ip_location", ""),
                            "like_count": data.get("like_count", "0"),
                            "sub_comment_count": data.get("sub_comment_count", "0"),
                            "parent_post_title": parent_post.get("title", ""),
                            "parent_post_desc": parent_post.get("desc", ""),
                            "source_file": filename,
                            "source_keyword": source_keyword,
                            "group": group_name,
                            "match_categories": {
                                "product": has_prod,
                                "flavor": has_flav,
                                "sensory": has_sens
                            },
                            "matched_keywords": {
                                "product": matched_prod_kws,
                                "flavor": matched_flav_kws,
                                "sensory": matched_sens_kws
                            }
                        })
                except Exception as e:
                    print(f"Error parsing line in {filename}: {e}")

    # Combine results
    all_insights = {
        "metadata": {
            "generation_time": datetime.now().isoformat(),
            "total_posts_filtered": len(matched_posts),
            "total_comments_filtered": len(matched_comments)
        },
        "matched_posts": matched_posts,
        "matched_comments": matched_comments
    }

    # Write JSON Output
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(all_insights, f, ensure_ascii=False, indent=2)
    print(f"Successfully wrote JSON insights to: {OUTPUT_JSON}")

    # Write CSV Output
    with open(OUTPUT_CSV, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        # Header
        writer.writerow([
            "Type", "Group", "Source Keyword", "ID", "Note/Parent ID", "Title/Content", "Nickname", 
            "IP Location", "Likes", "Sub-comments/Comments Count", 
            "Matched Products", "Matched Flavors", "Matched Sensory", "Source File"
        ])
        
        for item in matched_posts:
            writer.writerow([
                "Post", 
                item.get("group", "general"),
                item.get("source_keyword", ""),
                item["note_id"], 
                "", 
                f"{item['title']}\n\n{item['desc']}", 
                item["nickname"],
                item["ip_location"], 
                item["liked_count"], 
                item["comment_count"],
                ", ".join(item["matched_keywords"]["product"]),
                ", ".join(item["matched_keywords"]["flavor"]),
                ", ".join(item["matched_keywords"]["sensory"]),
                item["source_file"]
            ])

        for item in matched_comments:
            writer.writerow([
                "Comment", 
                item.get("group", "general"),
                item.get("source_keyword", ""),
                item["comment_id"], 
                item["note_id"], 
                item["content"], 
                item["nickname"],
                item["ip_location"], 
                item["like_count"], 
                item["sub_comment_count"],
                ", ".join(item["matched_keywords"]["product"]),
                ", ".join(item["matched_keywords"]["flavor"]),
                ", ".join(item["matched_keywords"]["sensory"]),
                item["source_file"]
            ])
            
    print(f"Successfully wrote CSV insights to: {OUTPUT_CSV}")
    print(f"Total matched items: {len(matched_posts) + len(matched_comments)} (Posts: {len(matched_posts)}, Comments: {len(matched_comments)})")
    print("="*60)

if __name__ == "__main__":
    main()
