Right Now:
---
- Add modal for downloading specific pngs, or all
- Add ability to add custom labs. 
Make labs work more cohesively with loader and the others.


Next
---

Multi Canvas:

Labs:
- Embolden the Titles of each Lab.
- Add ability to create custom labs

Necessary UI Things:
- Universal Formatting Buttons (B I -)" (Bold, Italics, and so on). Can map the buttons the add the points **, _, - around the highlighted text.

Templates:
- Split Alert Bands into three different pictures.
Add Sinus Tachycardia pictures from scenario.

Other:
- Instead of downloading all pngs at once. Make a modal with a download per png, or download all button.

- Add Listeners for Multipage mode
On some button press, or perhaps height crossing border of multipage textbox, copy the current canvas object into the canvas div, use the process pages function to return just the text that is enough for the first canvas, and the new canvas.
append the canvas. DO NOT download them. Simply keep them there, and add new canvas to an array.
Change the download canvas function to download an array of canvases, displaying a modal that contatins hyperlinks for each download. (Not pressing it instantly.)

Bugs
---
- selected fonts do not load up by default on Quill textbox
- Adding One Line field does not work with alignment

Backlog:
---
- ~~Removing Signature from Physician orders (COMPLETE)~~
- ~~Update all other templates to utilize their images instead of base64. Therefore one representaion is used~~
- ~~fix bug with not downloading images when multi page is disabled~~