# Document Generator — Code Examples Reference

## PDF Generation (WeasyPrint — HTML+CSS→PDF)

```python
from weasyprint import HTML, CSS
from jinja2 import Template

def generate_invoice_pdf(invoice_data, output_path):
    """Generate a professional invoice PDF from data."""
    template = Template("""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .invoice-title { font-size: 24px; font-weight: bold; color: #333; }
            .invoice-number { color: #666; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .total-row { font-weight: bold; font-size: 16px; }
            .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-number">Invoice #{{ invoice_number }}</div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                {% for item in items %}
                <tr>
                    <td>{{ item.description }}</td>
                    <td>{{ item.quantity }}</td>
                    <td>${{ item.unit_price }}</td>
                    <td>${{ item.total }}</td>
                </tr>
                {% endfor %}
                <tr class="total-row">
                    <td colspan="3">Total</td>
                    <td>${{ total }}</td>
                </tr>
            </tbody>
        </table>
        
        <div class="footer">
            Thank you for your business!
        </div>
    </body>
    </html>
    """)
    
    html_content = template.render(**invoice_data)
    HTML(string=html_content).write_pdf(output_path)
```

## Presentation Generation (python-pptx)

```python
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor

def generate_sales_presentation(sales_data, output_path):
    """Generate a sales report presentation from data."""
    prs = Presentation()
    
    # Title slide
    slide = prs.slides.add_slide(prs.slide_layouts[0])
    title = slide.shapes.title
    subtitle = slide.placeholders[1]
    title.text = "Sales Report Q4 2024"
    subtitle.text = f"Generated on {datetime.now().strftime('%Y-%m-%d')}"
    
    # Data slide
    slide = prs.slides.add_slide(prs.slide_layouts[5])  # Blank layout
    title = slide.shapes.title
    title.text = "Sales by Region"
    
    # Add table
    rows, cols = len(sales_data) + 1, 3
    left = Inches(1)
    top = Inches(2)
    width = Inches(8)
    height = Inches(4)
    
    table = slide.shapes.add_table(rows, cols, left, top, width, height).table
    
    # Header row
    table.cell(0, 0).text = "Region"
    table.cell(0, 1).text = "Revenue"
    table.cell(0, 2).text = "Growth"
    
    # Data rows
    for i, row_data in enumerate(sales_data, start=1):
        table.cell(i, 0).text = row_data["region"]
        table.cell(i, 1).text = f"${row_data['revenue']:,}"
        table.cell(i, 2).text = f"{row_data['growth']}%"
    
    prs.save(output_path)
```

## Spreadsheet Generation (openpyxl)

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.chart import BarChart, Reference

def generate_sales_report(sales_data, output_path):
    """Generate a formatted Excel report with charts."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Sales Data"
    
    # Header styling
    header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)
    
    # Headers
    headers = ["Month", "Revenue", "Expenses", "Profit"]
    for col, header in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")
    
    # Data
    for row, data in enumerate(sales_data, start=2):
        ws.cell(row=row, column=1, value=data["month"])
        ws.cell(row=row, column=2, value=data["revenue"])
        ws.cell(row=row, column=3, value=data["expenses"])
        ws.cell(row=row, column=4, value=data["profit"])
    
    # Add chart
    chart = BarChart()
    chart.title = "Revenue vs Expenses"
    chart.x_axis.title = "Month"
    chart.y_axis.title = "Amount ($)"
    
    data_ref = Reference(ws, min_col=2, min_row=1, max_col=3, max_row=len(sales_data)+1)
    cats = Reference(ws, min_col=1, min_row=2, max_row=len(sales_data)+1)
    chart.add_data(data_ref, titles_from_data=True)
    chart.set_categories(cats)
    
    ws.add_chart(chart, "F2")
    
    # Auto-adjust column widths
    for col in ws.columns:
        max_length = 0
        for cell in col:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        adjusted_width = (max_length + 2)
        ws.column_dimensions[col[0].column_letter].width = adjusted_width
    
    wb.save(output_path)
```

## Word Document Generation (python-docx)

```python
from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH

def generate_project_report(report_data, output_path):
    """Generate a Word document report with proper styles."""
    doc = Document()
    
    # Title
    title = doc.add_heading(report_data["title"], level=0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    # Executive summary
    doc.add_heading("Executive Summary", level=1)
    doc.add_paragraph(report_data["summary"])
    
    # Sections
    for section in report_data["sections"]:
        doc.add_heading(section["title"], level=2)
        doc.add_paragraph(section["content"])
        
        if "bullets" in section:
            for bullet in section["bullets"]:
                doc.add_paragraph(bullet, style="List Bullet")
    
    # Add table if data provided
    if "table_data" in report_data:
        doc.add_heading("Data Summary", level=2)
        table = doc.add_table(rows=1, cols=len(report_data["table_headers"]))
        table.style = "Light Grid Accent 1"
        
        # Header row
        for i, header in enumerate(report_data["table_headers"]):
            table.rows[0].cells[i].text = header
        
        # Data rows
        for row_data in report_data["table_data"]:
            row = table.add_row()
            for i, value in enumerate(row_data):
                row.cells[i].text = str(value)
    
    # Footer
    doc.add_page_break()
    doc.add_paragraph(f"Generated on {datetime.now().strftime('%Y-%m-%d')}")
    
    doc.save(output_path)
```

## Accessibility Guidelines

### PDFs
- Use tagged PDFs for screen reader compatibility
- Add alt text to all images
- Use proper heading hierarchy (H1, H2, H3)
- Ensure sufficient color contrast (WCAG AA: 4.5:1 for normal text)
- Use accessible fonts (sans-serif, minimum 12pt)

### Presentations
- Use slide layouts with proper heading structure
- Add alt text to images and charts
- Use high contrast colors
- Avoid animations that could trigger seizures (no flashing >3 times per second)

### Spreadsheets
- Use proper table headers
- Add cell comments for complex formulas
- Use named ranges for accessibility
- Provide alternative text for charts

### Word Documents
- Use built-in heading styles (Heading 1, Heading 2, etc.)
- Add alt text to images
- Use proper list styles (List Bullet, List Number)
- Ensure sufficient color contrast
