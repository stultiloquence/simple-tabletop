# simple-tabletop

Right now this is work in progress.

A super simple virtual tabletop. Features include 

- Display tokens on a rectangular grid that everyone can move. (Like when playing in real life, everyone can move everything. It can be very convenient, and better trust people you play games for fun with anyways.)
- Walls that prohibit movement.
- Vision/field of view, on a cell-by-cell basis, distinguishing between never before seen cells (black), cells seen before, and currently visible cells.
- Mouse, keyboard and touch controls.
- Measuring and tools for area of effect like cones and circles.
- A gamemaster is able to switch between different maps.
- Performance: There should at least be no load when nothing is moving.

## To do

- [x] Walls that prohibit movement and block vision.
- [ ] Doors that can be clicked. Maybe only by the game master to prevent accidental opening?
- [x] Vision. For now completely blocky. A cell is either entirely visible, has been seen before, or is not visible at all.
- [ ] Networking, server.
- [ ] Measuring and tools for area of effect like cones and circles.
- [ ] Mechanism for switching between maps.
- [ ] Controls:
	- [ ] Touch support.
	- [x] Iterating through entities stacked on top of each other when clicking them.
	- [x] Mouse-based controls for entity movement, entity dragging that snaps into the grid.
	- [x] Keyboard-based map movement and zoom.
	- [x] Keyboard-based entity selection (maybe just tabbing through entities.)
- [ ] Maybe some way for the game master to set up a map.
- [ ] Maybe per-player vision?
- [x] Handle vision and collision detection for entities larger than 1x1.

## Explicit Non-Goals

This project is strongly opinionated in its minimalism, possibly so much so that only I will ever use it. In contrast to more fully-featured alternatives like <https://foundryvtt.com/> or <https://roll20.net/>, it does not have any of the following:

- No light because tables I have played so far have mostly ignored lighting.
- No support for character sheets—I like to use <https://dndbeyond.com> or good old pen and paper.
- Not even support for displaying rolls—<https://dndbeyond.com> has a feature that does that, or I just roll a physical dice.
- No scripting—to me it feels like trying to emulate aspects of computer games (which is of course perfectly fine and can probably be really awesome! Just not what I am personally looking for.)
- No video calls, voice chat or even chat—there are plenty of programs for that.
- No support for playing sounds or music—I like to use a discord bot instead.
- No journals for taking notes—there are so many alternatives.
- No marketplace or surrounding social network.