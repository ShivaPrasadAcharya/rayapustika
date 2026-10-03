# Rayapustika

A public file catalogue with five columns: **SN, Folder name, File name, Link, Remarks**.

Files live beside `index.html` inside the `Files` folder:

| Folder | Files |
| --- | --- |
| `Files/pdf` | PDF |
| `Files/images` | JPG, PNG, WEBP, GIF, SVG and other images |
| `Files/docs` | DOC, DOCX, ODT, RTF, TXT, MD, HTML |
| `Files/spreadsheet` | XLS, XLSX, XLSM, ODS, CSV, TSV |
| `Files/powerpoints` | PPT, PPTX, PPTM, ODP, PPS, PPSX |

## Add your collected files

Open the relevant folder in this repository, choose **Add file → Upload files**, drag in the files, then choose **Commit changes**. Files can have Nepali names, spaces and nested subfolders. Every commit to `main` automatically rebuilds the catalogue and publishes the public site through GitHub Pages. Wait for the **Publish Rayapustika** workflow to complete, then refresh the page.

For your Windows folder `C:\Users\User\Downloads\filefolder`, place its files in the five matching folders above before uploading. Alternatively, attach the folder as a ZIP in ChatGPT for help importing it. No files from that Windows folder have been uploaded in the initial release.

## Remarks and custom link text

Edit `catalogue-metadata.json`. Use each file's exact path as a key:

```json
{
  "Files/pdf/My file.pdf": {
    "remarks": "Evidence law notes",
    "openText": "Open PDF",
    "downloadText": "Download PDF"
  }
}
```

The example above is documentation only. Link text is optional; defaults are **Open PDF**, **Download PDF**, **Open DOCX**, and so on. The page adds eye and download icons automatically.

## Browse and search

Choose a folder, search names and remarks, or use **Advanced search** for all words, any word, exact phrases, specific fields, file types, filename/remarks filters, excluded words and files with remarks. Quoted phrases work in all/any-word search. Search is case-insensitive and supports Nepali Unicode. It searches catalogue metadata, not the contents of documents. Results can be sorted and paginated.

PDFs and supported images open in a preview dialog. DOC/DOCX, XLS/XLSX and PPT/PPTX open in the Microsoft Office web viewer when the site is online; those previews require a publicly reachable file and may depend on the viewer's format/size limits. Other formats open the original file and may download according to browser support. Every file has a direct download link.

## Local use

Run `python scripts/build-index.py` after changing files, then open `index.html`, or run `python -m http.server 8000`. Static browsers cannot enumerate a folder themselves; the generator builds the catalogue from the actual files. GitHub Pages runs it automatically for online use.

## Hosting

GitHub Pages uses **GitHub Actions** as its source. The included workflow generates the index, packages only the site and collected files, and publishes them. All uploaded files in this repository and its site are public.
