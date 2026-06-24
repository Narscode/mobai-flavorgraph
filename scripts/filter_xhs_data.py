# -*- coding: utf-8 -*-
import os
import json
import glob
import re
import csv
from datetime import datetime

# Paths
MEDIA_CRAWLER_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "mediacrawler", "data", "xhs", "jsonl")
OUTPUT_DIR = "/Users/nareswari/mobai-flavorgraph-1"
OUTPUT_JSON = os.path.join(OUTPUT_DIR, "xhs_mobai_insights.json")
OUTPUT_CSV = os.path.join(OUTPUT_DIR, "xhs_mobai_insights.csv")

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
            # Clean up tuple results from regex groups if any
            for f in found:
                if isinstance(f, tuple):
                    matches.extend([x for x in f if x])
                else:
                    matches.append(f)
    return list(set(matches))

def main():
    print("="*60)
    print("MoBai Consumer Intelligence Filtering & Extraction Tool")
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
                    
                    posts[note_id] = {
                        "title": title,
                        "desc": desc,
                        "nickname": data.get("nickname", ""),
                        "note_url": data.get("note_url", "")
                    }

                    # Check for matches
                    match_text = f"{title} {desc}"
                    has_prod = check_match(match_text, PRODUCT_REGEX)
                    has_flav = check_match(match_text, FLAVOR_REGEX)
                    has_sens = check_match(match_text, SENSORY_REGEX)

                    if has_prod or has_flav or has_sens:
                        matched_prod_kws = extract_matched_keywords(match_text, PRODUCT_REGEX)
                        matched_flav_kws = extract_matched_keywords(match_text, FLAVOR_REGEX)
                        matched_sens_kws = extract_matched_keywords(match_text, SENSORY_REGEX)
                        
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
                    
                    has_prod = check_match(content, PRODUCT_REGEX)
                    has_flav = check_match(content, FLAVOR_REGEX)
                    has_sens = check_match(content, SENSORY_REGEX)

                    if has_prod or has_flav or has_sens:
                        matched_prod_kws = extract_matched_keywords(content, PRODUCT_REGEX)
                        matched_flav_kws = extract_matched_keywords(content, FLAVOR_REGEX)
                        matched_sens_kws = extract_matched_keywords(content, SENSORY_REGEX)

                        parent_post = posts.get(note_id, {})
                        
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
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(all_insights, f, ensure_ascii=False, indent=2)
    print(f"Successfully wrote JSON insights to: {OUTPUT_JSON}")

    # Write CSV Output
    with open(OUTPUT_CSV, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        # Header
        writer.writerow([
            "Type", "ID", "Note/Parent ID", "Title/Content", "Nickname", 
            "IP Location", "Likes", "Sub-comments/Comments Count", 
            "Matched Products", "Matched Flavors", "Matched Sensory", "Source File"
        ])
        
        for item in matched_posts:
            writer.writerow([
                "Post", 
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
