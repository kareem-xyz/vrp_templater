Right Now:
---
- ~~Removing Signature from Physician orders (COMPLETE)~~
- ~~Update all other templates to utilize their images instead of base64. Therefore one representaion is used~~
- ~~fix bug with not downloading images when multi page is disabled~~
Next
---

Multi Canvas:

Labs:
- Embolden the Titles of each Lab.
- Add ability to create custom labs

Necessary UI Things:
- "Universal Formatting Buttons (B I -)" (Bold, Italics, and so on). Can map the buttons the add the points **, _, - around the highlighted text.

Templates:
- Add Extra Fields to the MAR template, particularly next to the title.

- Add Listeners for Multipage mode
On some button press, or perhaps height crossing border of multipage textbox, copy the current canvas object into the canvas div, use the process pages function to return just the text that is enough for the first canvas, and the new canvas.
append the canvas. DO NOT download them. Simply keep them there, and add new canvas to an array.
Change the download canvas function to download an array of canvases, displaying a modal that contatins hyperlinks for each download. (Not pressing it instantly.)

Bugs
---
- fix bug with not downloading images when multi page is disabled
- selected fonts do not load up by default on Quill textbox
- Adding One Line field does not work with alignment