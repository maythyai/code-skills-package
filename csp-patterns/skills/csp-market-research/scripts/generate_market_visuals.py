#!/usr/bin/env python3
"""
Market Research Report Visual Generator

Batch generates visuals for a market research report using
csp-tech-diagram and csp-fal-ai-media skills.

Default behavior: Generate 5-6 core visuals only
Use --all flag to generate all 28 extended visuals

Usage:
    # Generate core 5-6 visuals (recommended for starting a report)
    python generate_market_visuals.py --topic "Electric Vehicle Charging" --output-dir figures/
    
    # Generate all 28 visuals (for comprehensive coverage)
    python generate_market_visuals.py --topic "AI in Healthcare" --output-dir figures/ --all
    
    # Skip existing files
    python generate_market_visuals.py --topic "Topic" --output-dir figures/ --skip-existing
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path


# Visual definitions with prompts
# Each tuple: (filename, tool, prompt_template, is_core)
# is_core=True for the 5-6 essential visuals to generate first

CORE_VISUALS = [
    # Priority 1: Market Growth Trajectory
    (
        "01_market_growth_trajectory.png",
        "csp-tech-diagram",
        "Bar chart {topic} market growth 2020 to 2034. Historical bars 2020-2024 in dark blue, "
        "projected bars 2025-2034 in light blue. Y-axis billions USD, X-axis years. "
        "CAGR annotation. Data labels on each bar. Vertical dashed line "
        "between 2024 and 2025. Title: Market Growth Trajectory. Professional white background"
    ),
    
    # Priority 2: TAM/SAM/SOM
    (
        "02_tam_sam_som.png",
        "csp-tech-diagram",
        "TAM SAM SOM concentric circles for {topic} market. Outer circle TAM Total Addressable "
        "Market. Middle circle SAM Serviceable Addressable Market. Inner circle SOM Serviceable "
        "Obtainable Market. Each labeled with acronym, full name. "
        "Blue gradient darkest outer to lightest inner. White background professional appearance"
    ),
    
    # Priority 3: Porter's Five Forces
    (
        "03_porters_five_forces.png",
        "csp-tech-diagram",
        "Porter's Five Forces diagram for {topic}. Center box Competitive Rivalry with rating. "
        "Four surrounding boxes with arrows to center: Top Threat of New Entrants, "
        "Left Bargaining Power Suppliers, Right Bargaining Power Buyers, "
        "Bottom Threat of Substitutes. Color code HIGH red, MEDIUM yellow, LOW green. "
        "Include 2-3 key factors per box. Professional appearance"
    ),
    
    # Priority 4: Competitive Positioning Matrix
    (
        "04_competitive_positioning.png",
        "csp-tech-diagram",
        "2x2 competitive positioning matrix {topic}. X-axis Market Focus Niche to Broad. "
        "Y-axis Solution Approach Product to Platform. Quadrants: Upper-right Platform Leaders, "
        "Upper-left Niche Platforms, Lower-right Product Leaders, Lower-left Specialists. "
        "Plot 8-10 company circles with names. Circle size = market share. "
        "Legend for sizes. Professional appearance"
    ),
    
    # Priority 5: Risk Heatmap
    (
        "05_risk_heatmap.png",
        "csp-tech-diagram",
        "Risk heatmap matrix {topic}. X-axis Impact Low Medium High Critical. "
        "Y-axis Probability Unlikely Possible Likely Very Likely. "
        "Cell colors: Green low risk, Yellow medium, Orange high, Red critical. "
        "Plot 10-12 numbered risks R1 R2 etc as labeled points. "
        "Legend with risk names. Professional clear"
    ),
    
    # Priority 6: Executive Summary Infographic (Optional)
    (
        "06_exec_summary_infographic.png",
        "csp-fal-ai-media",
        "Executive summary infographic for {topic} market research, one page layout, "
        "central large metric showing market size, four quadrants showing growth rate "
        "key players top segments regional leaders, modern flat design, professional "
        "blue and green color scheme, clean white background, corporate business aesthetic"
    ),
]

EXTENDED_VISUALS = [
    # Industry Ecosystem
    (
        "07_industry_ecosystem.png",
        "csp-tech-diagram",
        "Industry ecosystem value chain diagram for {topic} market. Horizontal flow left "
        "to right: Suppliers box → Manufacturers box → Distributors box → End Users box. "
        "Below each main box show 3-4 smaller boxes with example player types. Solid arrows "
        "for product flow, dashed arrows for money flow. Regulatory oversight layer above. "
        "Professional blue color scheme, white background, clear labels"
    ),
    
    # Regional Breakdown
    (
        "08_regional_breakdown.png",
        "csp-tech-diagram",
        "csp-tech-diagram",
        "Pie chart regional market breakdown for {topic}. North America 40% dark blue, "
        "Europe 28% medium blue, Asia-Pacific 22% teal, Latin America 6% light blue, "
        "Middle East Africa 4% gray blue. Show percentage for each slice. Legend on right. "
        "Title: Market Size by Region. Professional appearance"
    ),
    
    # Segment Growth
    (
        "09_segment_growth.png",
        "csp-tech-diagram",
        "Horizontal bar chart {topic} segment growth comparison. Y-axis 5-6 segment names, "
        "X-axis CAGR percentage 0-30%. Bars colored green highest to blue lowest. "
        "Data labels with percentages. Sorted highest to lowest. "
        "Title: Segment Growth Rate Comparison. Include market average line"
    ),
    
    # Driver Impact Matrix
    (
        "10_driver_impact_matrix.png",
        "csp-tech-diagram",
        "2x2 matrix driver impact assessment for {topic}. X-axis Impact Low to High, "
        "Y-axis Probability Low to High. Quadrants: Upper-right CRITICAL DRIVERS red, "
        "Upper-left MONITOR yellow, Lower-right WATCH CAREFULLY yellow, "
        "Lower-left LOWER PRIORITY green. Plot 8 labeled driver circles at positions. "
        "Circle size indicates current impact. Professional clear labels"
    ),
    
    # PESTLE Analysis
    (
        "11_pestle_analysis.png",
        "csp-tech-diagram",
        "PESTLE hexagonal diagram for {topic} market. Center hexagon labeled Market Analysis. "
        "Six surrounding hexagons: Political red, Economic blue, Social green, "
        "Technological orange, Legal purple, Environmental teal. Each outer hexagon "
        "has 2-3 bullet points of key factors. Lines connecting center to each. "
        "Professional appearance clear readable text"
    ),
    
    # Trends Timeline
    (
        "12_trends_timeline.png",
        "csp-tech-diagram",
        "Horizontal timeline {topic} trends 2024 to 2030. Plot 6-8 emerging trends at "
        "different years. Each trend with icon, name, brief description. Color code: "
        "Technology trends blue, Market trends green, Regulatory trends orange. "
        "Current marker at 2024. Professional clear labels"
    ),
    
    # Market Share Chart
    (
        "13_market_share.png",
        "csp-tech-diagram",
        "Pie chart market share {topic} top 10 companies. Company A 18% dark blue, "
        "Company B 15% medium blue, Company C 12% teal, Company D 10% light blue, "
        "5 more companies 5-8% each various blues, Others 15% gray. "
        "Percentage labels on slices. Legend with company names. "
        "Title: Market Share by Company. Colorblind-friendly colors professional"
    ),
    
    # Strategic Groups Map
    (
        "14_strategic_groups.png",
        "csp-tech-diagram",
        "Strategic group map {topic}. X-axis Geographic Scope Regional to Global. "
        "Y-axis Product Breadth Narrow to Broad. Draw 4-5 oval bubbles for strategic groups. "
        "Each bubble contains 2-4 company names. Bubble size = collective market share. "
        "Label groups: Global Generalists, Regional Specialists, Focused Innovators. "
        "Different colors per group. Professional clear labels"
    ),
    
    # Customer Segments
    (
        "15_customer_segments.png",
        "csp-tech-diagram",
        "Treemap customer segmentation {topic}. Large Enterprise 45% dark blue, "
        "Mid-Market 30% medium blue, SMB 18% light blue, Consumer 7% teal. "
        "Each segment shows name and percentage. Title: Customer Segmentation by Market Share. "
        "Professional appearance clear labels"
    ),
    (
        "16_segment_attractiveness.png",
        "csp-tech-diagram",
        "2x2 segment attractiveness matrix {topic}. X-axis Segment Size Small to Large. "
        "Y-axis Growth Rate Low to High. Quadrants: Upper-right PRIORITY Invest Heavily green, "
        "Upper-left INVEST TO GROW yellow, Lower-right HARVEST orange, "
        "Lower-left DEPRIORITIZE gray. Plot customer segments as circles. "
        "Circle size = profitability. Different colors. Professional"
    ),
    (
        "17_customer_journey.png",
        "csp-tech-diagram",
        "Customer journey horizontal flowchart {topic}. 5 stages left to right: Awareness, "
        "Consideration, Decision, Implementation, Advocacy. Each stage shows Key Activities, "
        "Pain Points, Touchpoints in rows below. Icons for each stage. "
        "Color gradient light to dark. Professional clear labels"
    ),
    
    # Technology Roadmap
    (
        "18_technology_roadmap.png",
        "csp-tech-diagram",
        "Technology roadmap {topic} 2024 to 2030. Three parallel horizontal tracks: "
        "Core Technology blue, Emerging Technology green, Enabling Technology orange. "
        "Milestones and tech introductions marked on each track. Vertical lines connect "
        "related tech. Year markers. Technology names labeled. Professional appearance"
    ),
    (
        "19_innovation_curve.png",
        "csp-tech-diagram",
        "Gartner Hype Cycle curve for {topic} technologies. Five phases: Innovation Trigger "
        "rising, Peak of Inflated Expectations at top, Trough of Disillusionment at bottom, "
        "Slope of Enlightenment rising, Plateau of Productivity stable. "
        "Plot 6-8 technologies on curve with labels. Color by category. Professional clear labels"
    ),
    
    # Regulatory Timeline
    (
        "20_regulatory_timeline.png",
        "csp-tech-diagram",
        "Regulatory timeline {topic} 2020 to 2028. Past regulations dark blue solid markers, "
        "current green marker, upcoming light blue dashed. Each shows regulation name, date, "
        "brief description. Vertical NOW line at 2024. Professional appearance clear labels"
    ),
    
    # Risk Mitigation Matrix
    (
        "21_risk_mitigation.png",
        "csp-tech-diagram",
        "Risk mitigation diagram {topic}. Left column risks in orange/red boxes. "
        "Right column mitigation strategies in green/blue boxes. Arrows connecting "
        "risks to mitigations. Group by category. Risk severity by color intensity. "
        "Include prevention and response. Professional clear labels"
    ),
    
    # Opportunity Matrix
    (
        "22_opportunity_matrix.png",
        "csp-tech-diagram",
        "2x2 opportunity matrix {topic}. X-axis Market Attractiveness Low to High. "
        "Y-axis Ability to Win Low to High. Quadrants: Upper-right PURSUE AGGRESSIVELY green, "
        "Upper-left BUILD CAPABILITIES yellow, Lower-right SELECTIVE INVESTMENT yellow, "
        "Lower-left AVOID red. Plot 6-8 opportunity circles with labels. "
        "Size = opportunity value. Professional"
    ),
    
    # Recommendation Priority Matrix
    (
        "23_recommendation_priority.png",
        "csp-tech-diagram",
        "2x2 priority matrix {topic} recommendations. X-axis Effort Low to High. "
        "Y-axis Impact Low to High. Quadrants: Upper-left QUICK WINS green Do First, "
        "Upper-right MAJOR PROJECTS blue Plan Carefully, Lower-left FILL-INS gray Do If Time, "
        "Lower-right THANKLESS TASKS red Avoid. Plot 6-8 numbered recommendations. Professional"
    ),
    
    # Implementation Timeline
    (
        "24_implementation_timeline.png",
        "csp-tech-diagram",
        "Gantt chart implementation {topic} 24 months. Phase 1 Foundation months 1-6 dark blue. "
        "Phase 2 Build months 4-12 medium blue. Phase 3 Scale months 10-18 teal. "
        "Phase 4 Optimize months 16-24 light blue. Overlapping bars. "
        "Key milestones as diamonds. Month markers X-axis. Professional"
    ),
    
    # Milestone Tracker
    (
        "25_milestone_tracker.png",
        "csp-tech-diagram",
        "Milestone tracker {topic} horizontal timeline 8-10 milestones. "
        "Each shows date, name, status: Completed green check, In Progress yellow circle, "
        "Upcoming gray circle. Group by phase. Phase labels above. "
        "Connected timeline line. Professional"
    ),
    
    # Financial Projections
    (
        "26_financial_projections.png",
        "csp-tech-diagram",
        "Combined bar and line chart {topic} 5-year projections. Bar chart revenue "
        "primary Y-axis dollars. Line chart growth rate secondary Y-axis percent. "
        "Three scenarios: Conservative gray, Base Case blue, Optimistic green. "
        "X-axis Year 1-5. Data labels. Legend. Title Financial Projections 5-Year. Professional"
    ),
    
    # Scenario Analysis
    (
        "27_scenario_analysis.png",
        "csp-tech-diagram",
        "Grouped bar chart {topic} scenario comparison. X-axis metrics: Revenue Y5, "
        "EBITDA Y5, Market Share, ROI. Three bars per metric: Conservative gray, "
        "Base Case blue, Optimistic green. Data labels. Legend. "
        "Title Scenario Analysis Comparison. Professional clear labels"
    ),
]


def get_generator_command(tool: str):
    """Resolve an external generator command for a tool.

    CSP skills are invoked as skills, not as sibling scripts at hardcoded paths.
    This script therefore does NOT assume a fixed relative path to another skill's
    internals. Instead it reads a generator command from the environment, falling
    back to None (prompt-emission mode) when no command is configured.

    Env vars:
      CSP_DIAGRAM_CMD  — command that takes a prompt on argv and writes a PNG
                         to a path given by CSP_DIAGRAM_OUT (or a -o flag).
                         Used for tool == "csp-tech-diagram".
      CSP_IMAGE_CMD    — command for tool == "csp-fal-ai-media" (same contract).

    When no command is configured, the caller emits the prompt so the agent can
    feed it to the csp-tech-diagram / csp-fal-ai-media skill directly.
    """
    if tool == "csp-tech-diagram":
        return os.environ.get("CSP_DIAGRAM_CMD")
    if tool == "csp-fal-ai-media":
        return os.environ.get("CSP_IMAGE_CMD")
    raise ValueError(f"Unknown tool: {tool}")


def generate_visual(
    filename: str,
    tool: str,
    prompt: str,
    output_dir: Path,
    topic: str,
    skip_existing: bool = False,
    verbose: bool = False
) -> bool:
    """Generate a single visual using the appropriate tool.

    If an external generator command is configured via env, run it with the
    prompt and write to output_dir/filename. Otherwise emit the prompt so the
    agent can hand it to the csp-tech-diagram / csp-fal-ai-media skill.
    """
    output_path = output_dir / filename

    # Skip if exists and skip_existing is True
    if skip_existing and output_path.exists():
        if verbose:
            print(f"  [SKIP] {filename} already exists")
        return True

    # Format prompt with topic
    formatted_prompt = prompt.format(topic=topic)

    gen_cmd = get_generator_command(tool)

    if gen_cmd:
        # External generator configured — shell out.
        import shlex
        cmd = shlex.split(gen_cmd) + [formatted_prompt, "-o", str(output_path)]
        if verbose:
            print(f"  [GEN] {filename}")
            print(f"        Tool: {tool}")
            print(f"        Prompt: {formatted_prompt[:80]}...")
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120  # 2 minute timeout per image
            )
            if result.returncode == 0:
                if verbose:
                    print(f"  [OK] {filename} generated successfully")
                return True
            print(f"  [ERROR] {filename} failed:")
            if result.stderr:
                print(f"         {result.stderr[:200]}")
            return False
        except subprocess.TimeoutExpired:
            print(f"  [TIMEOUT] {filename} generation timed out")
            return False
        except Exception as e:
            print(f"  [ERROR] {filename}: {str(e)}")
            return False
    else:
        # No external generator — emit the prompt for the agent to feed to the
        # named CSP skill (csp-tech-diagram / csp-fal-ai-media).
        print(f"  [PROMPT] {filename} — invoke the `{tool}` skill:")
        print(f"           prompt: {formatted_prompt}")
        print(f"           save to: {output_path}")
        return True


def main():
    parser = argparse.ArgumentParser(
        description="Generate visuals for a market research report (default: 5-6 core visuals)"
    )
    parser.add_argument(
        "--topic", "-t",
        required=True,
        help="Market topic (e.g., 'Electric Vehicle Charging Infrastructure')"
    )
    parser.add_argument(
        "--output-dir", "-o",
        default="figures",
        help="Output directory for generated images (default: figures)"
    )
    parser.add_argument(
        "--all", "-a",
        action="store_true",
        help="Generate all 27 extended visuals (default: only core 5-6)"
    )
    parser.add_argument(
        "--skip-existing", "-s",
        action="store_true",
        help="Skip generation if file already exists"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show detailed output"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be generated without actually generating"
    )
    parser.add_argument(
        "--only",
        type=str,
        help="Only generate visuals matching this pattern (e.g., '01_', 'porter')"
    )
    
    args = parser.parse_args()
    
    # Create output directory
    output_dir = Path(args.output_dir)
    if not args.dry_run:
        output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"\n{'='*60}")
    print(f"Market Research Visual Generator")
    print(f"{'='*60}")
    print(f"Topic: {args.topic}")
    print(f"Output Directory: {output_dir.absolute()}")
    print(f"Mode: {'All Visuals (27)' if args.all else 'Core Visuals Only (5-6)'}")
    print(f"Skip Existing: {args.skip_existing}")
    print(f"{'='*60}\n")
    
    # Select visual set based on --all flag
    if args.all:
        visuals_to_generate = CORE_VISUALS + EXTENDED_VISUALS
        print("Generating ALL visuals (core + extended)\n")
    else:
        visuals_to_generate = CORE_VISUALS
        print("Generating CORE visuals only (use --all for extended set)\n")
    
    # Filter visuals if --only specified
    if args.only:
        pattern = args.only.lower()
        visuals_to_generate = [
            v for v in VISUALS 
            if pattern in v[0].lower() or pattern in v[2].lower()
        ]
        print(f"Filtered to {len(visuals_to_generate)} visuals matching '{args.only}'\n")
    
    if args.dry_run:
        print("DRY RUN - The following visuals would be generated:\n")
        for filename, tool, prompt in visuals_to_generate:
            formatted = prompt.format(topic=args.topic)
            print(f"  {filename}")
            print(f"    Tool: {tool}")
            print(f"    Prompt: {formatted[:60]}...")
            print()
        return
    
    # Generate all visuals
    total = len(visuals_to_generate)
    success = 0
    failed = 0
    skipped = 0
    
    for i, (filename, tool, prompt) in enumerate(visuals_to_generate, 1):
        print(f"\n[{i}/{total}] Generating {filename}...")
        
        result = generate_visual(
            filename=filename,
            tool=tool,
            prompt=prompt,
            output_dir=output_dir,
            topic=args.topic,
            skip_existing=args.skip_existing,
            verbose=args.verbose
        )
        
        if result:
            if args.skip_existing and (output_dir / filename).exists():
                skipped += 1
            else:
                success += 1
        else:
            failed += 1
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"Generation Complete")
    print(f"{'='*60}")
    print(f"Total:    {total}")
    print(f"Success:  {success}")
    print(f"Skipped:  {skipped}")
    print(f"Failed:   {failed}")
    print(f"{'='*60}")
    
    if failed > 0:
        print(f"\nWARNING: {failed} visuals failed to generate.")
        print("Check the output above for error details.")
        print("You may need to generate failed visuals manually.")
    
    print(f"\nOutput directory: {output_dir.absolute()}")


if __name__ == "__main__":
    main()
