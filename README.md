# simple-tabletop

Right now this is work in progress.

A super simple virtual tabletop. Features / Roadmap:

- [x] Display tokens on a rectangular grid that everyone can move. (Like when playing in real life, everyone can move everything. It can be very convenient, and better trust people you play games for fun with anyways.)
- [ ] Walls that prohibit movement and block vision.
- [ ] Doors that can be clicked. Maybe only by the game master to prevent accidental opening?
- [ ] Vision. For now completely blocky. A cell is either entirely visible, has been seen before, or is not visible at all.
- [ ] Networking, server.
- [ ] Measuring and tools for area of effect like cones and circles.
- [ ] Mechanism for switching between maps.
- [ ] Controls:
	- [ ] Touch support.
	- [ ] Mouse-based controls for entity movement.
	- [ ] Entity dragging that snaps into the grid, with a preview of visible / reachable squares?
	- [ ] Keyboard-based map movement and zoom.
	- [ ] Keyboard-baed entity selection (maybe just tabbing through entities.)
- [ ] Maybe some way for the game master to set up a map.
- Probably no light because tables I have played so far have mostly ignored lighting.

Other goals:

- Performance. No load when nothing is moving.

## Explicit Non-Goals

This project is strongly opinionated in its minimalism, possibly so much so that only I will ever use it. In contrast to more fully-featured alternatives like <https://foundryvtt.com/> or <https://roll20.net/>, it does not have any of the following:

- No video calls, voice chat or even chat—there are plenty of programs for that.
- No support for character sheets—I like to use <https://dndbeyond.com>.
- Not even support for displaying rolls—<https://dndbeyond.com> has a feature that does that.
- No support for playing sounds or music—I like to use a discord bot instead.
- No journals for taking notes—there are so many alternatives.
- No marketplace or surrounding social network.
- No scripting—to me it feels like trying to emulate aspects of computer games (which is of course perfectly fine and can probably be really awesome! Just not what I am personally looking for.)