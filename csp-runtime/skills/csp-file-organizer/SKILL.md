---
name: csp-file-organizer
description: "通过理解上下文、查找重复文件、建议更合理的目录结构并自动化清理任务，智能整理电脑中的文件与文件夹，让数字工作空间长期保持整洁有序。触发：整理文件夹、清理重复文件、帮我归类文件、整理下载目录。"
version: 0.2.0
layer: 4
category: runtime
phase: build
domain: devops
scope: implementation
tools: [Read, Write, Edit, Bash, Glob, Grep]
related_skills: []
role: specialist
---

# file-organizer

## Overview

Intelligently organizes your files and folders across your computer by understanding context, finding duplicates, suggesting better structures, and automating cleanup tasks. Reduces cognitive load and keeps your digital workspace tidy without manual effort.

## Quick Start

```bash
# TODO: Add quick start commands
```

## Usage

Please refer to the documentation for detailed usage instructions.
---
name: file-organizer
description: 通过理解上下文、查找重复文件、建议更合理的目录结构并自动化清理任务，智能整理你电脑中的文件与文件夹。降低整理负担，让数字工作空间长期保持整洁有序。
---

# File Organizer

This skill acts as your personal organization assistant, helping you maintain a clean, logical file structure across your computer without the mental overhead of constant manual organization.

## When to Use This Skill

- Your Downloads folder is a chaotic mess
- You can't find files because they're scattered everywhere
- You have duplicate files taking up space
- Your folder structure doesn't make sense anymore
- You want to establish better organization habits
- You're starting a new project and need a good structure
- You're cleaning up before archiving old projects

## What This Skill Does

1. **Analyzes Current Structure**: Reviews your folders and files to understand what you have
2. **Finds Duplicates**: Identifies duplicate files across your system
3. **Suggests Organization**: Proposes logical folder structures based on your content
4. **Automates Cleanup**: Moves, renames, and organizes files with your approval
5. **Maintains Context**: Makes smart decisions based on file types, dates, and content
6. **Reduces Clutter**: Identifies old files you probably don't need anymore

## How to Use

### From Your Home Directory

```
cd ~
```

然后向 Agent 请求帮助：

```
Help me organize my Downloads folder
```

```
Find duplicate files in my Documents folder
```

```
Review my project directories and suggest improvements
```

### Specific Organization Tasks

```
Organize these downloads into proper folders based on what they are
```

```
Find duplicate files and help me decide which to keep
```

```
Clean up old files I haven't touched in 6+ months
```

```
Create a better folder structure for my [work/projects/photos/etc]
```

## Instructions

When a user requests file organization help:

1. **Understand the Scope**
   
   Ask clarifying questions:
   - Which directory needs organization? (Downloads, Documents, entire home folder?)
   - What's the main problem? (Can't find things, duplicates, too messy, no structure?)
   - Any files or folders to avoid? (Current projects, sensitive data?)
   - How aggressively to organize? (Conservative vs. comprehensive cleanup)

2. **Analyze Current State**
   
   Review the target directory:
   ```bash
   # Get overview of current structure
   ls -la [target_directory]
   
   # Check file types and sizes
   find [target_directory] -type f -exec file {} \; | head -20
   
   # Identify largest files
   du -sh [target_directory]/* | sort -rh | head -20
   
   # Count file types
   find [target_directory] -type f | sed 's/.*\.//' | sort | uniq -c | sort -rn
   ```
   
   Summarize findings:
   - Total files and folders
   - File type breakdown
   - Size distribution
   - Date ranges
   - Obvious organization issues

3. **Identify Organization Patterns**
   
   Based on the files, determine logical groupings:
   
   **By Type**:
   - Documents (PDFs, DOCX, TXT)
   - Images (JPG, PNG, SVG)
   - Videos (MP4, MOV)
   - Archives (ZIP, TAR, DMG)
   - Code/Projects (directories with code)
   - Spreadsheets (XLSX, CSV)
   - Presentations (PPTX, KEY)
   
   **By Purpose**:
   - Work vs. Personal
   - Active vs. Archive
   - Project-specific
   - Reference materials
   - Temporary/scratch files
   
   **By Date**:
   - Current year/month
   - Previous years
   - Very old (archive candidates)

4. **Find Duplicates**
   
   When requested, search for duplicates:
   ```bash
   # Find exact duplicates by hash
   find [directory] -type f -exec md5 {} \; | sort | uniq -d
   
   # Find files with same name
   find [directory] -type f -printf '%f\n' | sort | uniq -d
   
   # Find similar-sized files
   find [directory] -type f -printf '%s %p\n' | sort -n
   ```
   
   For each set of duplicates:
   - Show all file paths
   - Display sizes and modification dates
   - Recommend which to keep (usually newest or best-named)
   - **Important**: Always ask for confirmation before deleting

5. **Propose Organization Plan**
   
   Present a clear plan before making changes:
   
   ```markdown
   # Organization Plan for [Directory]
   
   ## Current State
   - X files across Y folders
   - [Size] total
   - File types: [breakdown]
   - Issues: [list problems]
   
   ## Proposed Structure
   
   ```
   [Directory]/
   ├── Work/
   │   ├── Projects/
   │   ├── Documents/
   │   └── Archive/
   ├── Personal/
   │   ├── Photos/
   │   ├── Documents/
   │   └── Media/
   └── Downloads/
       ├── To-Sort/
       └── Archive/
   ```
   
   ## Changes I'll Make
   
   1. **Create new folders**: [list]
   2. **Move files**:
      - X PDFs → Work/Documents/
      - Y images → Personal/Photos/
      - Z old files → Archive/
   3. **Rename files**: [any renaming patterns]
   4. **Delete**: [duplicates or trash files]
   
   ## Files Needing Your Decision
   
   - [List any files you're unsure about]
   
   Ready to proceed? (yes/no/modify)
   ```

6. **Execute Organization**
   
   After approval, organize systematically:
   
   ```bash
   # Create folder structure
   mkdir -p "path/to/new/folders"
   
   # Move files with clear logging
   mv "old/path/file.pdf" "new/path/file.pdf"
   
   # Rename files with consistent patterns
   # Example: "YYYY-MM-DD - Description.ext"
   ```
   
   **Important Rules**:
   - Always confirm before deleting anything
   - Log all moves for potential undo
   - Preserve original modification dates
   - Handle filename conflicts gracefully
   - Stop and ask if you encounter unexpected situations

7. **Provide Summary and Maintenance Tips**
   
   After organizing:
   
   ```markdown
   # Organization Complete! ✨
   
   ## What Changed
   
   - Created [X] new folders
   - Organized [Y] files
   - Freed [Z] GB by removing duplicates
   - Archived [W] old files
   
   ## New Structure
   
   [Show the new folder tree]
   
   ## Maintenance Tips
   
   To keep this organized:
   
   1. **Weekly**: Sort new downloads
   2. **Monthly**: Review and archive completed projects
   3. **Quarterly**: Check for new duplicates
   4. **Yearly**: Archive old files
   
   ## Quick Commands for You
   
   ```bash
   # Find files modified this week
   find . -type f -mtime -7
   
   # Sort downloads by type
   [custom command for their setup]
   
   # Find duplicates
   [custom command]
   ```
   
   Want to organize another folder?
   ```

## Examples

### Example 1: Organizing Downloads

**User**: "My Downloads folder is a mess with 500+ files. Help me organize it."

**Process**:
1. Analyzes Downloads folder
2. Finds patterns: work docs, personal photos, installers, random PDFs
3. Proposes structure:
   - Downloads/
     - Work/
     - Personal/
     - Installers/ (DMG, PKG files)
     - Archive/
     - ToSort/ (things needing decisions)
4. Asks for confirmation
5. Moves files intelligently based on content and names
6. Results: 500 files → 5 organized folders

### Example 2: Finding and Removing Duplicates

**User**: "Find duplicate files in my Documents and help me decide which to keep."

**Output**:
```markdown
# Found 23 Sets of Duplicates (156 MB total)

## Duplicate Set 1: "proposal.pdf"
- `/Documents/proposal.pdf` (2.3 MB, modified: 2024-03-15)
- `/Documents/old/proposal.pdf` (2.3 MB, modified: 2024-03-15)
- `/Desktop/proposal.pdf` (2.3 MB, modified: 2024-03-10)

**Recommendation**: Keep `/Documents/proposal.pdf` (most recent in correct location)
Delete the other 2 copies?

[Continue for all duplicates...]
```

### Example 3: Restructuring Projects Folder

**User**: "Review my ~/Projects directory and suggest improvements."

**Output**:
```markdown
# Analysis of ~/Projects

## Current Structure Issues
- Mix of active and archived projects (3+ years old)
- No consistent naming convention
- Some projects at root, others in random subfolders
- Duplicate folders (project-name, project-name-old, project-name-v2)

## Proposed Structure

```
Projects/
├── Active/
│   ├── client-work/
│   ├── side-projects/
│   └── learning/
├── Archive/
│   ├── 2022/
│   ├── 2023/
│   └── 2024/
└── Templates/
```

## Specific Changes
1. Move 12 projects not touched since 2022 → Archive/
2. Consolidate 4 duplicate project folders
3. Rename projects to consistent format: "client-name-project-name"
4. Create Archive for old work

Want me to implement this?
```

### Example 4: Organizing Photos by Date

**User**: "Organize my photo folders by year and month."

**Output**: Creates structure like:
```
Photos/
├── 2023/
│   ├── 01-January/
│   ├── 02-February/
│   └── ...
├── 2024/
│   ├── 01-January/
│   └── ...
└── Unsorted/
```

Then moves photos based on EXIF data or file modification dates.

## Common Organization Tasks

### Downloads Cleanup
```
Organize my Downloads folder - move documents to Documents, 
images to Pictures, keep installers separate, and archive files 
older than 3 months.
```

### Project Organization
```
Review my Projects folder structure and help me separate active 
projects from old ones I should archive.
```

### Duplicate Removal
```
Find all duplicate files in my Documents folder and help me 
decide which ones to keep.
```

### Desktop Cleanup
```
My Desktop is covered in files. Help me organize everything into 
my Documents folder properly.
```

### Photo Organization
```
Organize all photos in this folder by date (year/month) based 
on when they were taken.
```

### Work/Personal Separation
```
Help me separate my work files from personal files across my 
Documents folder.
```

## Pro Tips

1. **Start Small**: Begin with one messy folder (like Downloads) to build trust
2. **Regular Maintenance**: Run weekly cleanup on Downloads
3. **Consistent Naming**: Use "YYYY-MM-DD - Description" format for important files
4. **Archive Aggressively**: Move old projects to Archive instead of deleting
5. **Keep Active Separate**: Maintain clear boundaries between active and archived work
6. **Trust the Process**: 让 Agent 承担文件归类的认知负担，你只需确认即可

## Best Practices

### Folder Naming
- Use clear, descriptive names
- Avoid spaces (use hyphens or underscores)
- Be specific: "client-proposals" not "docs"
- Use prefixes for ordering: "01-current", "02-archive"

### File Naming
- Include dates: "2024-10-17-meeting-notes.md"
- Be descriptive: "q3-financial-report.xlsx"
- Avoid version numbers in names (use version control instead)
- Remove download artifacts: "document-final-v2 (1).pdf" → "document.pdf"

### When to Archive
- Projects not touched in 6+ months
- Completed work that might be referenced later
- Old versions after migration to new systems
- Files you're hesitant to delete (archive first)

## Related Use Cases

- Setting up organization for a new computer
- Preparing files for backup/archiving
- Cleaning up before storage cleanup
- Organizing shared team folders
- Structuring new project directories

## Project Repository Cleanup Mode

> 当用户要求整理**项目仓库根目录**（非个人文件夹）时，激活此模式。

### 触发信号

- "整理项目根目录" / "清理项目文件" / "项目文件太乱了"
- "根目录下这些文件该放哪" / "coverage 文件散落根目录"
- 用户明确要求**对该仓库**做文件卫生审计/迁移；仅位于 Git 根或仅要求改 CSP 规范不构成清理授权

### 项目根目录卫生规则

> 优先读取项目自身根目录约定、`csp-documentation-governance` 与 `csp-knowledge-hub/references/project-entry-contract.md`。`prompts/000-project-governance_csp.md` 是调用说明，不是目标项目的绝对路径白名单。

**Step 1 — 根目录审计（用户要求审计具体仓库时）**：先确认 git 跟踪状态、读写者（构建脚本/CI/import）、入站链接、保留要求和项目的现有目录映射。只提出经证实的候选，不按文件名直接执行移动：

| 候选 | 判断依据 | 下一步 |
|------|----------|--------|
| 测试产物（`coverage.*`、Playwright、pacts） | 是可重建输出还是经批准的契约/视觉基线？谁写它，谁读它？ | 更改 producer 的输出目录并验证引用；有效基线/契约保留原路径直至迁移完成 |
| 根目录的人读文档 | 是否为活跃 PRD、路由入口或长期文档？ | 依据人类文档约定给出路径建议；更新读者前不动文件 |
| 待评估 CSP 路径（`spark-output/`、`.planning/`） | 运行配置/工具是否仍写入或消费？ | 仍是生产者目标时保留；否则提出 old→new 映射和回退步骤 |
| 缓存/系统产物 | 可重建？已被 Git 跟踪？忽略规则是否会误伤源文件？ | 提议精确的 `.gitignore`；清理索引前取得授权并检查影响 |
| 重复/版本样式名 | 内容、引用与保留义务是否真的冗余？ | 不根据 `_v2` 或时间戳猜重复；提出证据与来源归属 |
| 尚不确定 | 没有足够的读写者/保留证据 | 标记待确认，保留现状；先调查再提问 |

**Step 2 — 审计报告**：先出报告、等用户确认再执行：

```markdown
## 项目根目录卫生审计 — {project}

### 当前状态
- 根目录文件/目录：{N} 项
- 合法项（保留）：{M} 项
- 待评估移动：{X} 项
- 待评估清理/归档：{Y} 项

### 候选迁移（不是自动操作）
| 路径 | 原用途/读写者 | 建议目标 | 待改引用与 producer | 证据/回退 |
|------|--------------|----------|--------------------|-----------|
| ./coverage.json | 测试配置输出；CI 是否消费待核实 | 仅在调整配置后选项目证据目录 | 测试命令、CI、忽略规则 | 更新引用前保持原位 |

### 清理候选
| 路径 | 重建/引用/跟踪状态 | 建议动作 | 授权状态 |
|------|-------------------|----------|----------|
| .pytest_cache/ | 可重建，确认未跟踪 | 建议忽略 | 待确认 |

### 需要你确认
- {未知项，如有}

仅需审计/完善规范时到此结束。若另行授权迁移，请明确范围、目标路径及允许的回退方式。
```

**Step 3 — 执行 + 验证**：仅在用户明确授权迁移或清理时执行。先改生成工具和入站引用，再移动并重指 manifest；跑项目实际的 build/test/link 检查（不假定 npm）。验证失败时回滚并报告，不能留下半套路径。若任务只要求制定规范或审计，本步骤不执行。

**Step 4 — 维护建议**：输出"下次如何避免散乱"的建议——哪个 CI step 应该产出到正确路径、哪个 `.gitignore` 规则缺失。不每次手动整理。

### 红线

- **不猜测分类**：先查读写者、Git 跟踪、项目留存规则；无法确定的保持原位。
- **保留活跃资产**：活跃 PRD、未关闭 finding 引用的证据、不可重建的数据不得按文件数量/年龄移动或删除。
- **不破坏工具链**：移动后运行项目实际的构建、测试与文档引用检查，失败回滚。
- **先审计后执行**：只有规范设计/只审计的任务不执行文件迁移；删除或向外发布另行确认。