import os
import zipfile
import shutil
from PIL import Image

def build_template():
    base_dir = '/Users/apple/Projects/Client/IMS-V2'
    unpacked_dir = os.path.join(base_dir, 'templates/mou/unpacked')
    output_docx = os.path.join(base_dir, 'templates/mou/quantech-mou.docx')
    donor_docx = os.path.join(base_dir, 'templates/mou/Memorandum-of-Understanding-Template-09.docx')
    if not os.path.exists(donor_docx):
        donor_docx = output_docx

    if not os.path.exists(os.path.join(unpacked_dir, '[Content_Types].xml')):
        print(f"[0/5] Extracting base docx files from {donor_docx} to {unpacked_dir}")
        with zipfile.ZipFile(donor_docx, 'r') as z:
            z.extractall(unpacked_dir)

    # 1. Prepare Logo in word/media/image1.jpeg
    logo_src = os.path.join(base_dir, 'public/quantech/Quantech-Logo.png')
    logo_dst = os.path.join(unpacked_dir, 'word/media/image1.jpeg')
    os.makedirs(os.path.dirname(logo_dst), exist_ok=True)
    
    img = Image.open(logo_src)
    bbox = img.getbbox()
    cropped = img.crop(bbox)
    bg = Image.new('RGB', cropped.size, (255, 255, 255))
    if cropped.mode == 'RGBA':
        bg.paste(cropped, mask=cropped.split()[3])
    else:
        bg.paste(cropped)
    # Save crisp JPEG for header
    w = 600
    h = int(w * (cropped.size[1] / cropped.size[0]))
    bg.resize((w, h), Image.LANCZOS).save(logo_dst, 'JPEG', quality=95)
    print(f"[1/5] Prepared logo at {logo_dst} ({w}x{h})")

    # 2. Update word/media/provider_sign.png if needed or keep for docxtemplater
    provider_sign_src = os.path.join(base_dir, 'public/assets/sign.png')
    provider_sign_dst = os.path.join(base_dir, 'templates/mou/provider_sign.png')
    shutil.copy(provider_sign_src, provider_sign_dst)
    print(f"[2/5] Copied static provider signature to {provider_sign_dst}")

    # 3. Clean word/_rels/document.xml.rels
    rels_path = os.path.join(unpacked_dir, 'word/_rels/document.xml.rels')
    os.makedirs(os.path.dirname(rels_path), exist_ok=True)
    rels_content = """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.jpeg"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  <Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
  <Relationship Id="rId7" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
  <Relationship Id="rId8" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
  <Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rId10" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>"""
    with open(rels_path, 'w', encoding='utf-8') as f:
        f.write(rels_content)

    # 4. Clean docProps/core.xml
    core_path = os.path.join(unpacked_dir, 'docProps/core.xml')
    os.makedirs(os.path.dirname(core_path), exist_ok=True)
    core_content = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-09-19T00:00:00Z</dcterms:created>
  <dc:creator>Quantech Infosystem LLP</dc:creator>
  <dc:description>Quantech Platform Official Memorandum of Understanding</dc:description>
  <dc:language>en-IN</dc:language>
  <cp:lastModifiedBy>Quantech Platform</cp:lastModifiedBy>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-09-19T00:00:00Z</dcterms:modified>
  <dc:title>Memorandum of Understanding</dc:title>
  <dc:subject>MOU Agreement</dc:subject>
</cp:coreProperties>"""
    with open(core_path, 'w', encoding='utf-8') as f:
        f.write(core_content)

    # 5. Clean word/footer1.xml (Page X of Y + dynamic title)
    footer_path = os.path.join(unpacked_dir, 'word/footer1.xml')
    footer_content = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:p>
    <w:pPr>
      <w:pStyle w:val="Footer"/>
      <w:tabs>
        <w:tab w:val="right" w:pos="9026"/>
      </w:tabs>
      <w:rPr>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:color w:val="64748B"/>
        <w:sz w:val="18"/>
        <w:szCs w:val="18"/>
      </w:rPr>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:color w:val="64748B"/>
        <w:sz w:val="18"/>
        <w:szCs w:val="18"/>
      </w:rPr>
      <w:t xml:space="preserve">Quantech MOU: {schoolName}  |  Ref: {refId}</w:t>
    </w:r>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:color w:val="64748B"/>
        <w:sz w:val="18"/>
        <w:szCs w:val="18"/>
      </w:rPr>
      <w:tab/>
      <w:t xml:space="preserve">Page </w:t>
    </w:r>
    <w:fldSimple w:instr="PAGE">
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
          <w:color w:val="64748B"/>
          <w:sz w:val="18"/>
        </w:rPr>
        <w:t>1</w:t>
      </w:r>
    </w:fldSimple>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:color w:val="64748B"/>
        <w:sz w:val="18"/>
      </w:rPr>
      <w:t xml:space="preserve"> of </w:t>
    </w:r>
    <w:fldSimple w:instr="NUMPAGES">
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
          <w:color w:val="64748B"/>
          <w:sz w:val="18"/>
        </w:rPr>
        <w:t>3</w:t>
      </w:r>
    </w:fldSimple>
  </w:p>
</w:ftr>"""
    with open(footer_path, 'w', encoding='utf-8') as f:
        f.write(footer_content)
    print("[3/5] Configured footer1.xml with dynamic tags and Page X of Y fields")

    # 5b. Clean word/header1.xml (Running page header + Watermark CONFIDENTIAL)
    header_path = os.path.join(unpacked_dir, 'word/header1.xml')
    header_content = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <w:p>
    <w:pPr>
      <w:pStyle w:val="Header"/>
    </w:pPr>
    <w:r>
      <w:pict>
        <v:shapetype id="_x0000_t136" coordsize="21600,21600" o:spt="136" adj="10800" path="m@7,l@8,m@5,21600l@6,21600e">
          <v:formulas>
            <v:f eqn="val #0"/>
            <v:f eqn="prod #0 4 3"/>
            <v:f eqn="prod #0 2 3"/>
            <v:f eqn="prod #0 1 3"/>
            <v:f eqn="prod #0 1 6"/>
            <v:f eqn="prod #0 1 12"/>
            <v:f eqn="prod #0 1 24"/>
            <v:f eqn="prod #0 1 48"/>
            <v:f eqn="prod #0 1 96"/>
          </v:formulas>
          <v:path textpathok="t" o:connecttype="rect"/>
          <v:textpath on="t" fitshape="t"/>
          <o:lock v:ext="edit" text="t"/>
        </v:shapetype>
        <v:shape id="PowerPlusWaterMarkObject" o:spid="_x0000_s1025" type="#_x0000_t136" style="position:absolute;left:0;text-align:center;margin-left:0;margin-top:0;width:480pt;height:120pt;rotation:315;z-index:-251657216;mso-position-horizontal:center;mso-position-horizontal-relative:margin;mso-position-vertical:center;mso-position-vertical-relative:margin" fillcolor="#CBD5E1" stroked="f">
          <v:fill opacity=".20"/>
          <v:textpath style="font-family:'Arial';font-weight:bold" string="CONFIDENTIAL"/>
        </v:shape>
      </w:pict>
    </w:r>
  </w:p>
  <w:p>
    <w:pPr>
      <w:pStyle w:val="Header"/>
      <w:pBdr>
        <w:bottom w:val="single" w:sz="6" w:space="4" w:color="CBD5E1"/>
      </w:pBdr>
      <w:jc w:val="right"/>
      <w:rPr>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:color w:val="64748B"/>
        <w:sz w:val="17"/>
        <w:szCs w:val="17"/>
      </w:rPr>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:color w:val="64748B"/>
        <w:sz w:val="17"/>
        <w:szCs w:val="17"/>
      </w:rPr>
      <w:t>MOU Agreement with {schoolName}</w:t>
    </w:r>
  </w:p>
</w:hdr>"""
    with open(header_path, 'w', encoding='utf-8') as f:
        f.write(header_content)

    # Register header in [Content_Types].xml
    ct_path = os.path.join(unpacked_dir, '[Content_Types].xml')
    if os.path.exists(ct_path):
        with open(ct_path, 'r', encoding='utf-8') as f:
            ct = f.read()
        if '/word/header1.xml' not in ct:
            ct = ct.replace(
                '<Override PartName="/word/footer1.xml"',
                '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml"'
            )
            with open(ct_path, 'w', encoding='utf-8') as f:
                f.write(ct)
    print("[3b/5] Configured header1.xml with running header and CONFIDENTIAL watermark")


    # 6. Generate word/document.xml with full Quantech MOU matter and dynamic tags
    doc_path = os.path.join(unpacked_dir, 'word/document.xml')
    
    # Calculate cx and cy in EMUs for logo preserving natural aspect ratio
    cx = 1200000
    cy = int(cx * (cropped.size[1] / cropped.size[0]))

    doc_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" mc:Ignorable="w14 wp14 w15">
  <w:body>

    <!-- Header Letterhead Table (2 Columns: Logo left, Corporate info right) -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9026" w:type="dxa"/>
        <w:jc w:val="center"/>
        <w:tblLayout w:type="fixed"/>
        <w:tblBorders>
          <w:bottom w:val="single" w:sz="12" w:space="4" w:color="1E3A8A"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="72" w:type="dxa"/>
          <w:bottom w:w="120" w:type="dxa"/>
          <w:left w:w="72" w:type="dxa"/>
          <w:right w:w="72" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="2600"/>
        <w:gridCol w:w="6426"/>
      </w:tblGrid>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2600" w:type="dxa"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:r>
              <w:drawing>
                <wp:inline distT="0" distB="0" distL="0" distR="0">
                  <wp:extent cx="{cx}" cy="{cy}"/>
                  <wp:docPr id="1" name="Quantech Logo"/>
                  <wp:cNvGraphicFramePr>
                    <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
                  </wp:cNvGraphicFramePr>
                  <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                      <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                        <pic:nvPicPr>
                          <pic:cNvPr id="1" name="Quantech Logo"/>
                          <pic:cNvPicPr>
                            <a:picLocks noChangeAspect="1" noChangeArrowheads="1"/>
                          </pic:cNvPicPr>
                        </pic:nvPicPr>
                        <pic:blipFill>
                          <a:blip r:embed="rId2"/>
                          <a:stretch><a:fillRect/></a:stretch>
                        </pic:blipFill>
                        <pic:spPr>
                          <a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>
                          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                        </pic:spPr>
                      </pic:pic>
                    </a:graphicData>
                  </a:graphic>
                </wp:inline>
              </w:drawing>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="6426" w:type="dxa"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="right"/>
              <w:spacing w:after="30" w:line="240" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                <w:b/>
                <w:color w:val="1E3A8A"/>
                <w:sz w:val="24"/>
              </w:rPr>
              <w:t>QUANTECH INFOSYSTEM LLP.</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr>
              <w:jc w:val="right"/>
              <w:spacing w:after="20" w:line="220" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                <w:color w:val="475569"/>
                <w:sz w:val="18"/>
              </w:rPr>
              <w:t>3rd Floor, Behind Gurudwara, Mumbai-Agra Highway, Dhule, Maharashtra – 424001</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr>
              <w:jc w:val="right"/>
              <w:spacing w:after="40" w:line="220" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                <w:color w:val="475569"/>
                <w:sz w:val="18"/>
              </w:rPr>
              <w:t>Email: admin@quantechinfosystem.com | Web: https://quantechinfosystem.com</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <!-- Document Title & Subtitle -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="240" w:after="60"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
          <w:b/>
          <w:color w:val="1E3A8A"/>
          <w:sz w:val="34"/>
          <w:szCs w:val="34"/>
        </w:rPr>
        <w:t>MEMORANDUM OF UNDERSTANDING</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="0" w:after="160"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
          <w:i/>
          <w:color w:val="475569"/>
          <w:sz w:val="22"/>
        </w:rPr>
        <w:t>{{mouSubtitle}}</w:t>
      </w:r>
    </w:p>

    <!-- Reference Number and Date -->
    <w:p>
      <w:pPr>
        <w:jc w:val="right"/>
        <w:spacing w:before="0" w:after="200"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
          <w:color w:val="64748B"/>
          <w:sz w:val="20"/>
        </w:rPr>
        <w:t xml:space="preserve">Ref No: </w:t>
      </w:r>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
          <w:b/>
          <w:color w:val="1E3A8A"/>
          <w:sz w:val="20"/>
        </w:rPr>
        <w:t>{{refId}}</w:t>
      </w:r>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
          <w:color w:val="64748B"/>
          <w:sz w:val="20"/>
        </w:rPr>
        <w:t xml:space="preserve">   |   Date: </w:t>
      </w:r>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
          <w:b/>
          <w:color w:val="0F172A"/>
          <w:sz w:val="20"/>
        </w:rPr>
        <w:t>{{date}}</w:t>
      </w:r>
    </w:p>

    <!-- Parties Box Table (Clean 2 columns) -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9026" w:type="dxa"/>
        <w:jc w:val="center"/>
        <w:tblLayout w:type="fixed"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="none"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="140" w:type="dxa"/>
          <w:bottom w:w="140" w:type="dxa"/>
          <w:left w:w="180" w:type="dxa"/>
          <w:right w:w="180" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="4513"/>
        <w:gridCol w:w="4513"/>
      </w:tblGrid>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4513" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:after="40"/></w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                <w:b/>
                <w:color w:val="1E3A8A"/>
                <w:sz w:val="20"/>
              </w:rPr>
              <w:t>PARTY A — SERVICE PROVIDER</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="20"/></w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                <w:b/>
                <w:sz w:val="22"/>
              </w:rPr>
              <w:t>Quantech Infosystem LLP.</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="20"/></w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                <w:color w:val="475569"/>
                <w:sz w:val="20"/>
              </w:rPr>
              <w:t>{{providerRoleDetail}}</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="0"/></w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                <w:color w:val="64748B"/>
                <w:sz w:val="20"/>
              </w:rPr>
              <w:t>India</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4513" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:after="40"/></w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                <w:b/>
                <w:color w:val="1E3A8A"/>
                <w:sz w:val="20"/>
              </w:rPr>
              <w:t>PARTY B — INSTITUTION</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="20"/></w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                <w:b/>
                <w:sz w:val="22"/>
              </w:rPr>
              <w:t>{{schoolName}}</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="20"/></w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                <w:color w:val="475569"/>
                <w:sz w:val="20"/>
              </w:rPr>
              <w:t>{{city}}</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="20"/></w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                <w:color w:val="475569"/>
                <w:sz w:val="20"/>
              </w:rPr>
              <w:t>{{address}}</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="0"/></w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                <w:b/>
                <w:color w:val="1E3A8A"/>
                <w:sz w:val="20"/>
              </w:rPr>
              <w:t xml:space="preserve">UDISE Code: </w:t>
            </w:r>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                <w:b/>
                <w:sz w:val="20"/>
              </w:rPr>
              <w:t>{{udiseCode}}</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <!-- SECTION I -->
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading1"/>
        <w:spacing w:before="280" w:after="80"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
          <w:b/>
          <w:color w:val="1E3A8A"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>1. Background &amp; Purpose</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="100" w:line="276" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr>
        <w:t xml:space="preserve">This Memorandum of Understanding ("MOU") is entered into between </w:t>
      </w:r>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="22"/></w:rPr>
        <w:t>Quantech Infosystem LLP.</w:t>
      </w:r>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr>
        <w:t xml:space="preserve"> (hereinafter "the Provider") and </w:t>
      </w:r>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="22"/></w:rPr>
        <w:t>{{schoolName}}</w:t>
      </w:r>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr>
        <w:t xml:space="preserve"> (hereinafter "the School"), collectively referred to as "the Parties."</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="140" w:line="276" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr>
        <w:t>{{clause1Purpose}}</w:t>
      </w:r>
    </w:p>

    <!-- SECTION II -->
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading1"/>
        <w:spacing w:before="240" w:after="80"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
          <w:b/>
          <w:color w:val="1E3A8A"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>2. Scope of Enrollment</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="100" w:line="276" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr>
        <w:t>{{clause2Intro}}</w:t>
      </w:r>
    </w:p>

    <!-- Commercial Terms Table -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9026" w:type="dxa"/>
        <w:jc w:val="center"/>
        <w:tblLayout w:type="fixed"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="100" w:type="dxa"/>
          <w:bottom w:w="100" w:type="dxa"/>
          <w:left w:w="140" w:type="dxa"/>
          <w:right w:w="140" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="3800"/>
        <w:gridCol w:w="5226"/>
      </w:tblGrid>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="3800" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>
          </w:tcPr>
          <w:p>
            <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="20"/></w:rPr><w:t>Agreed Student Enrollment Strength</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="5226" w:type="dxa"/></w:tcPr>
          <w:p>
            <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="1E3A8A"/><w:sz w:val="22"/></w:rPr><w:t>{{studentCount}} Students</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="3800" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/>
          </w:tcPr>
          <w:p>
            <w:r><w:t>{{#isCollege}}</w:t></w:r>
            <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="20"/></w:rPr><w:t>College Year-wise Breakdown</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="5226" w:type="dxa"/></w:tcPr>
          <w:p>
            <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="20"/></w:rPr><w:t>1st Year: {{yr1Count}} students @ ₹{{yr1Rate}} | 2nd Year: {{yr2Count}} students @ ₹{{yr2Rate}}</w:t></w:r>
            <w:r><w:t>{{/isCollege}}</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="3800" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>
          </w:tcPr>
          <w:p>
            <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="20"/></w:rPr><w:t>Total Commercial Amount</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="5226" w:type="dxa"/></w:tcPr>
          <w:p>
            <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="22"/></w:rPr><w:t>{{totalPrice}}</w:t></w:r>
            <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="64748B"/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">  ({{totalPriceLabel}})</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="3800" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>
          </w:tcPr>
          <w:p>
            <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="20"/></w:rPr><w:t>{{upfrontRowTitle}}</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="5226" w:type="dxa"/></w:tcPr>
          <w:p>
            <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="059669"/><w:sz w:val="22"/></w:rPr><w:t>{{upfrontPrice}}</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="3800" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/>
          </w:tcPr>
          <w:p>
            <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="20"/></w:rPr><w:t>Billing Schedule &amp; Terms</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="5226" w:type="dxa"/></w:tcPr>
          <w:p>
            <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="475569"/><w:sz w:val="18"/></w:rPr><w:t>{{commFooter}}</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <w:p>
      <w:pPr>
        <w:spacing w:before="120" w:after="160" w:line="276" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr>
        <w:t>{{clause2Sla}}</w:t>
      </w:r>
    </w:p>

    <!-- SECTION III -->
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading1"/>
        <w:spacing w:before="240" w:after="80"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
          <w:b/>
          <w:color w:val="1E3A8A"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>3. Obligations of the Provider</w:t>
      </w:r>
    </w:p>
    <w:p><w:r><w:t>{{#clause3Items}}</w:t></w:r></w:p>
    <w:p>
      <w:pPr>
        <w:pStyle w:val="ListParagraph"/>
        <w:spacing w:before="40" w:after="40" w:line="260" w:lineRule="auto"/>
        <w:ind w:left="400" w:hanging="260"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="1E3A8A"/><w:sz w:val="22"/></w:rPr>
        <w:t xml:space="preserve">•  </w:t>
      </w:r>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr>
        <w:t>{{text}}</w:t>
      </w:r>
    </w:p>
    <w:p><w:r><w:t>{{/clause3Items}}</w:t></w:r></w:p>

    <!-- SECTION IV -->
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading1"/>
        <w:spacing w:before="240" w:after="80"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
          <w:b/>
          <w:color w:val="1E3A8A"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>{{clause4Title}}</w:t>
      </w:r>
    </w:p>
    <w:p><w:r><w:t>{{#clause4Items}}</w:t></w:r></w:p>
    <w:p>
      <w:pPr>
        <w:pStyle w:val="ListParagraph"/>
        <w:spacing w:before="40" w:after="40" w:line="260" w:lineRule="auto"/>
        <w:ind w:left="400" w:hanging="260"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="1E3A8A"/><w:sz w:val="22"/></w:rPr>
        <w:t xml:space="preserve">•  </w:t>
      </w:r>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr>
        <w:t>{{text}}</w:t>
      </w:r>
    </w:p>
    <w:p><w:r><w:t>{{/clause4Items}}</w:t></w:r></w:p>

    <!-- SECTION V -->
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading1"/>
        <w:spacing w:before="240" w:after="80"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
          <w:b/>
          <w:color w:val="1E3A8A"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>5. Confidentiality</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="140" w:line="276" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr>
        <w:t>Both Parties agree to maintain strict confidentiality of all information exchanged under this MOU, including student data, pricing, and platform configurations. Student data shall be used solely for the purpose of providing the agreed services and shall not be shared with any third party without prior written consent.</w:t>
      </w:r>
    </w:p>

    <!-- SECTION VI -->
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading1"/>
        <w:spacing w:before="240" w:after="80"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
          <w:b/>
          <w:color w:val="1E3A8A"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>6. Duration &amp; Termination</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="140" w:line="276" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr>
        <w:t xml:space="preserve">This MOU shall be effective from the date of signing and shall remain valid for a period of </w:t>
      </w:r>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="22"/></w:rPr>
        <w:t>{{durationWords}}</w:t>
      </w:r>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr>
        <w:t xml:space="preserve">, renewable by mutual written consent. Either Party may terminate this MOU with </w:t>
      </w:r>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="22"/></w:rPr>
        <w:t>30 days' written notice</w:t>
      </w:r>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr>
        <w:t xml:space="preserve">. Upon termination, the School's data shall be made available for export for a period of 30 days before deletion.</w:t>
      </w:r>
    </w:p>

    <!-- SECTION VII -->
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading1"/>
        <w:spacing w:before="240" w:after="80"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
          <w:b/>
          <w:color w:val="1E3A8A"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>7. Limitation of Liability</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="140" w:line="276" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr>
        <w:t>The Provider's total liability under this MOU shall not exceed the total fees paid by the School in the preceding 3 months. The Provider shall not be liable for indirect, incidental, or consequential damages arising from the use or inability to use the platform.</w:t>
      </w:r>
    </w:p>

    <!-- SECTION 8 -->
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading1"/>
        <w:spacing w:before="240" w:after="80"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
          <w:b/>
          <w:color w:val="1E3A8A"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>8. Governing Law</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="140" w:line="276" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr>
        <w:t xml:space="preserve">This MOU shall be governed by the laws of India. Any disputes arising out of or in connection with this MOU shall be subject to the exclusive jurisdiction of the courts in </w:t>
      </w:r>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="22"/></w:rPr>
        <w:t>{{jurisdiction}}</w:t>
      </w:r>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr>
        <w:t>.</w:t>
      </w:r>
    </w:p>

    <!-- SECTION 9 -->
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading1"/>
        <w:spacing w:before="240" w:after="80"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
          <w:b/>
          <w:color w:val="1E3A8A"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>9. Entire Agreement</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="240" w:line="276" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr>
        <w:t>This MOU constitutes the entire understanding between the Parties with respect to its subject matter and supersedes all prior discussions, representations, or agreements. Amendments to this MOU shall be valid only if made in writing and signed by both Parties.</w:t>
      </w:r>
    </w:p>

    <!-- SIGNATURES (2-Column Table) -->
    <w:p>
      <w:pPr>
        <w:keepNext/>
        <w:spacing w:before="240" w:after="120"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
          <w:b/>
          <w:color w:val="1E3A8A"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>Signatures &amp; Execution</w:t>
      </w:r>
    </w:p>

    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9026" w:type="dxa"/>
        <w:jc w:val="center"/>
        <w:tblLayout w:type="fixed"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="none"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="160" w:type="dxa"/>
          <w:bottom w:w="160" w:type="dxa"/>
          <w:left w:w="180" w:type="dxa"/>
          <w:right w:w="180" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="4513"/>
        <w:gridCol w:w="4513"/>
      </w:tblGrid>
      <w:tr>
        <!-- Party B Column (Institution) -->
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4513" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="FAFAFA"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:after="80"/></w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                <w:b/>
                <w:color w:val="1E3A8A"/>
                <w:sz w:val="22"/>
              </w:rPr>
              <w:t>For and on behalf of Institution (Party B):</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr>
            <w:r>
              <w:t>{{%schoolSignature}}</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr>
              <w:pBdr><w:bottom w:val="single" w:sz="8" w:space="1" w:color="94A3B8"/></w:pBdr>
              <w:spacing w:after="80"/>
            </w:pPr>
            <w:r><w:t></w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="20"/></w:pPr>
            <w:r>
              <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="22"/></w:rPr>
              <w:t>{{principalName}}</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="20"/></w:pPr>
            <w:r>
              <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="475569"/><w:sz w:val="20"/></w:rPr>
              <w:t>{{designation}}</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="20"/></w:pPr>
            <w:r>
              <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="475569"/><w:sz w:val="20"/></w:rPr>
              <w:t>{{schoolName}}</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="20"/></w:pPr>
            <w:r>
              <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="64748B"/><w:sz w:val="18"/></w:rPr>
              <w:t xml:space="preserve">UDISE Code: {{udiseCode}}</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="0"/></w:pPr>
            <w:r>
              <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="64748B"/><w:sz w:val="18"/></w:rPr>
              <w:t xml:space="preserve">Date: {{date}}</w:t>
            </w:r>
          </w:p>
        </w:tc>

        <!-- Party A Column (Quantech Provider) -->
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4513" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="FAFAFA"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:after="80"/></w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                <w:b/>
                <w:color w:val="1E3A8A"/>
                <w:sz w:val="22"/>
              </w:rPr>
              <w:t>For and on behalf of Provider (Party A):</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr>
            <w:r>
              <w:t>{{%providerSignature}}</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr>
              <w:pBdr><w:bottom w:val="single" w:sz="8" w:space="1" w:color="94A3B8"/></w:pBdr>
              <w:spacing w:after="80"/>
            </w:pPr>
            <w:r><w:t></w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="20"/></w:pPr>
            <w:r>
              <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="22"/></w:rPr>
              <w:t>Authorised Representative</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="20"/></w:pPr>
            <w:r>
              <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="475569"/><w:sz w:val="20"/></w:rPr>
              <w:t>Director / CEO</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="20"/></w:pPr>
            <w:r>
              <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="475569"/><w:sz w:val="20"/></w:rPr>
              <w:t>Quantech Infosystem LLP.</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="20"/></w:pPr>
            <w:r>
              <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="64748B"/><w:sz w:val="18"/></w:rPr>
              <w:t>For office use only</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="0"/></w:pPr>
            <w:r>
              <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="64748B"/><w:sz w:val="18"/></w:rPr>
              <w:t xml:space="preserve">Date: {{date}}</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <!-- Digital Signing Audit Footer Line -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="280" w:after="80"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
          <w:color w:val="94A3B8"/>
          <w:sz w:val="16"/>
        </w:rPr>
        <w:t xml:space="preserve">This document was digitally generated &amp; executed via Quantech Platform MOU Portal  |  Ref: {{refId}}  |  Date: {{date}}</w:t>
      </w:r>
    </w:p>

    <!-- Page Section Setup: A4 format (11906 x 16838), 1 inch margins (1440 dxa) -->
    <w:sectPr>
      <w:headerReference w:type="default" r:id="rId5"/>
      <w:footerReference w:type="default" r:id="rId6"/>
      <w:pgSz w:w="11906" w:h="16838" w:code="9"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
      <w:cols w:space="720"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>

  </w:body>
</w:document>"""

    with open(doc_path, 'w', encoding='utf-8') as f:
        f.write(doc_xml)
    print(f"[4/5] Generated clean word/document.xml with real Quantech MOU matter")

    # 7. Zip the unpacked directory into output_docx
    with zipfile.ZipFile(output_docx, 'w', zipfile.ZIP_DEFLATED) as zip_out:
        for root, dirs, files in os.walk(unpacked_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, unpacked_dir)
                zip_out.write(full_path, rel_path)
    
    print(f"[5/5] Successfully packaged master template to: {output_docx} (Size: {os.path.getsize(output_docx)} bytes)")

if __name__ == '__main__':
    build_template()
