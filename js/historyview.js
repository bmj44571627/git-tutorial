﻿define(['d3'], function () {
    "use strict";

    var renderArrowheadMarker,
        preventOverlap,
        cx, cy, px1, py1, px2, py2, tagY;

    renderArrowheadMarker = function (svg) {
        svg.append('svg:marker')
            .attr('id', 'triangle')
            .attr('refX', 5)
            .attr('refY', 5)
            .attr('markerUnits', 'strokeWidth')
            .attr('markerWidth', 4)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
            .attr('viewBox', '0 0 10 10')
            .append('svg:path')
                .attr('d', 'M 0 0 L 10 5 L 0 10 z');
    };

    preventOverlap = function preventOverlap(commit, view) {
        var commitData = view.commitData,
            centerBranchLine = view.height / 2,
            shift = view.commitRadius * 4.5,
            overlapped = null;

        for (var i = 0; i < commitData.length; i++) {
            var c = commitData[i];
            if (c.cx === commit.cx && c.cy === commit.cy && c !== commit) {
                overlapped = c;
                break;
            }
        }

        if (overlapped) {
            var oParent = view.getCommit(overlapped.parent),
                parent = view.getCommit(commit.parent);
        
            if (overlapped.cy < centerBranchLine) {
                overlapped = oParent.cy < parent.cy ? overlapped : commit;
                overlapped.cy -= shift;
            } else {
                overlapped = oParent.cy > parent.cy ? overlapped : commit;
                overlapped.cy += shift;
            }

            preventOverlap(overlapped, view);
        }
    };

    cx = function (commit, view) {
        var parent = view.getCommit(commit.parent);
        return parent.cx + (view.commitRadius * 4.5);
    };

    cy = function (commit, view) {
        var parent = view.getCommit(commit.parent),
            parentCY = parent.cy,
            centerBranchLine = view.height / 2,
            shift = view.commitRadius * 4.5,
            branches = [], // count the existing branches
            branchIndex = 0;

        for (var i = 0; i < view.commitData.length; i++) {
            var d = view.commitData[i];

            if (d.parent === commit.parent) {
                branches.push(d.id);
            }
        }

        branchIndex = branches.indexOf(commit.id);

        if (parentCY === centerBranchLine) {
            var direction = 1;
            for (var bi = 0; bi < branchIndex; bi++) {
                direction *= -1;
            }

            shift *= Math.ceil(branchIndex / 2);

            return parentCY + (shift * direction);
        }

        if (parentCY < centerBranchLine) {
            return parentCY - (shift * branchIndex);
        } else if (parentCY > centerBranchLine) {
            return parentCY + (shift * branchIndex);
        }
    };

    // calculates the x1 point for commit pointer lines
    px1 = function (commit, view) {
        var parent = view.getCommit(commit.parent),
            startCX = commit.cx,
            diffX = startCX - parent.cx,
            diffY = parent.cy - commit.cy,
            length = Math.sqrt((diffX * diffX) + (diffY * diffY));

        return startCX - (view.pointerMargin * (diffX / length));
    };

    // calculates the y1 point for commit pointer lines
    py1 = function (commit, view) {
        var parent = view.getCommit(commit.parent),
            startCY = commit.cy,
            diffX = commit.cx - parent.cx,
            diffY = parent.cy - startCY,
            length = Math.sqrt((diffX * diffX) + (diffY * diffY));

        return startCY + (view.pointerMargin * (diffY / length));
    };

    px2 = function (commit, view) {
        var parent = view.getCommit(commit.parent),
            endCX = parent.cx,
            diffX = commit.cx - endCX,
            diffY = parent.cy - commit.cy,
            length = Math.sqrt((diffX * diffX) + (diffY * diffY));

        return endCX + (view.pointerMargin * 1.2 * (diffX / length));
    };

    py2 = function (commit, view) {
        var parent = view.getCommit(commit.parent),
            endCY = parent.cy,
            diffX = commit.cx - parent.cx,
            diffY = endCY - commit.cy,
            length = Math.sqrt((diffX * diffX) + (diffY * diffY));

        return endCY - (view.pointerMargin * 1.2 * (diffY / length));
    };

    tagY = function tagY(t, view) {
        var commit = view.getCommit(t.commit),
            commitCY = commit.cy,
            tags = commit.tags,
            tagIndex = tags.indexOf(t.name);

        if (tagIndex === -1) {
            tagIndex = tags.length;
        }

        if (commitCY < (view.height / 2)) {
            return commitCY - 45 - (tagIndex * 25);
        } else {
            return commitCY + 40 + (tagIndex * 25);
        }
    };

    /**
     * @class HistoryView
     * @constructor
     */
    function HistoryView(config) {
        var commitData = config.commitData || [],
            commit;

        for (var i = 0; i < commitData.length; i++) {
            commit = commitData[i];
            !commit.parent && (commit.parent = 'initial');
            !commit.tags && (commit.tags = []);
        }

        this.name = config.name || 'UnnamedHistoryView';
        this.commitData = commitData;

        this.branches = ['HEAD'];
        this.currentBranch = config.currentBranch || 'master';

        this.width = config.width || 700;
        this.height = config.height || 400;
        this.commitRadius = config.commitRadius || 20;
        this.pointerMargin = this.commitRadius * 1.3;

        this.initialCommit = {
			id: 'initial',
			parent: null,
			cx: -(this.commitRadius * 2),
			cy: this.height / 2
		};
    }

    HistoryView.generateId = function () {
        return Math.random().toString(36).substring(2, 9);
    };

    HistoryView.prototype = {
		/**
         * @method getCommit
         * @param ref {String} the id or a tag name that refers to the commit
         * @return {Object} the commit datum object
         */
        getCommit: function (ref) {
            if (ref === 'initial') {
                return this.initialCommit;
            }

            var commitData = this.commitData,
                matchedCommit = null;

            for (var i = 0; i < commitData.length; i++) {
                var commit = commitData[i];
                if (commit.id === ref) {
                    matchedCommit = commit;
                    break;
                }

                if (commit.tags.indexOf(ref) >= 0) {
                    matchedCommit = commit;
                    break;
                }
            }

            if (!commit) {
                throw new Error('Cannot find commit: ' + ref);
            }

            return matchedCommit;
        },

        /**
         * @method getCircle
         * @param ref {String} the id or a tag name that refers to the commit
         * @return {d3 Selection} the d3 selected SVG circle
         */
        getCircle: function (ref) {
            var circle = this.svg.select('#' + this.name + '-' + ref),
                commit;

            if (circle && !circle.empty()) {
                return circle;
            }

            commit = this.getCommit(ref);

            if (!commit) {
                return null;
            }

            return this.svg.select('#' + this.name + '-' + commit.id);
        },

        getCircles: function () {
            return this.svg.selectAll('circle.commit');
        },

        /**
         * @method render
         * @param container {String} selector for the container to render the SVG into
         */
        render: function (container) {
            var svgContainer, svg;

			svgContainer = container.append('div')
                .classed('svg-container', true);

            svg = svgContainer.append('svg:svg');

            svg.attr('id', this.name)
                .attr('width', this.width)
                .attr('height', this.height);

            this.svg = svg;

            renderArrowheadMarker(svg);
            this._renderCommits();

            svg.append('svg:text')
                .classed('current-branch-display', true)
                .attr('x', 10)
                .attr('y', 25);

            this._setCurrentBranch(this.currentBranch);
        },
		
		destroy: function () {
			this.svg.remove();

			for (var prop in this) {
				if (this.hasOwnProperty(prop)) {
					this[prop] = null;
				}
			}
		},

        _renderCommits: function () {
            for (var i = 0; i < this.commitData.length; i++) {
                var commit = this.commitData[i];
                commit.cx = cx(commit, this);
                commit.cy = cy(commit, this);
                preventOverlap(commit, this);
            }

            this._renderCircles();
            this._renderPointers();
            this._renderIdLabels();
            this.checkout(this.currentBranch);
        },

        _renderCircles: function () {
            var view = this,
                existingCircles,
                newCircles,
                fixPosition;

            fixPosition = function (selection) {
                selection
                    .attr('cx', function (d) {
                        return d.cx;
                    })
                    .attr('cy', function (d) {
                        return d.cy;
                    });
            };

            existingCircles = this.svg.selectAll('circle.commit')
                .data(this.commitData, function (d) { return d.id; });

            existingCircles.transition()
                .duration(500)
                .call(fixPosition);

            newCircles = existingCircles.enter()
                .append('svg:circle')
                .attr('id', function (d) {
                    return view.name + '-' + d.id;
                })
                .attr('class', 'commit')
                .call(fixPosition)
                .attr('r', 1)
                .transition()
                .duration(500)
                .attr('r', this.commitRadius);

        },

        _renderPointers: function () {
            var view = this,
                existingPointers,
                newPointers;

            existingPointers = this.svg.selectAll('line.commit-pointer')
                .data(this.commitData, function (d) { return d.id; });

            existingPointers.transition()
                .duration(500)
                .attr('x1', function (d) {
                    return px1(d, view);
                })
                .attr('y1', function (d) {
                    return py1(d, view);
                })
                .attr('x2', function (d) {
                    return px2(d, view);
                })
                .attr('y2', function (d) {
                    return py2(d, view);
                });

            newPointers = existingPointers.enter()
                .insert('svg:line', ':first-child')
                .attr('id', function (d) {
                    return view.name + '-' + d.id + '-to-' + d.parent;
                })
                .attr('class', 'commit-pointer')
                .attr('marker-end', 'url(#triangle)')
                .attr('x1', function (d) { return px1(d, view); })
                .attr('y1', function (d) { return py1(d, view); })
                .attr('x2', function () { return d3.select(this).attr('x1'); })
                .attr('y2', function () {  return d3.select(this).attr('y1'); })
                .transition()
                .duration(500)
                .attr('x2', function (d) { return px2(d, view); })
                .attr('y2', function (d) { return py2(d, view); });
        },

        _renderIdLabels: function () {
            var view = this,
                existingLabels,
                newLabels,
                fixPosition;

            fixPosition = function (selection) {
                selection.attr('x', function (d) {
                    return d.cx;
                }).attr('y', function (d) {
                    return d.cy + view.commitRadius + 14;
                });
            };

            existingLabels = this.svg.selectAll('text.id-label')
                .data(this.commitData, function (d) { return d.id; });

            existingLabels.transition().call(fixPosition);

            newLabels = existingLabels.enter()
                .append('text')
                .attr('class', 'id-label')
                .text(function (d) { return d.id + '..'; })
                .call(fixPosition);
        },

        _renderTags: function () {
            var view = this,
                tagData = [], i,
                headCommit = null,
                existingTags, newTags;

            for (i = 0; i < this.commitData.length; i++) {
                var c = this.commitData[i];
                for (var t = 0; t < c.tags.length; t++) {
                    var tagName = c.tags[t];
                    if (tagName.toUpperCase() === 'HEAD') {
                        headCommit = c;
                    }

                    if (this.branches.indexOf(tagName) === -1) {
                        this.branches.push(tagName);
                    }

                    tagData.push({name: tagName, commit: c.id});
                }
            }

            if (!headCommit) {
                headCommit = this.getCommit(this.currentBranch);
                headCommit.tags.push('HEAD');
                tagData.push({name: 'HEAD', commit: headCommit.id});
            }

            existingTags = this.svg.selectAll('g.branch-tag')
                .data(tagData, function (d) { return d.name; });

            existingTags.select('rect')
                .transition()
                .duration(500)
                .attr('y', function (d) { return tagY(d, view); })
                .attr('x', function (d) {
                    var commit = view.getCommit(d.commit),
                        width = Number(d3.select(this).attr('width'));

                    return commit.cx - (width / 2);
                });

            existingTags.select('text')
                .transition()
                .duration(500)
                .attr('y', function (d) { return tagY(d, view) + 14; })
                .attr('x', function (d) {
                    var commit = view.getCommit(d.commit);
                    return commit.cx;
                });

            newTags = existingTags.enter()
                .append('g')
                .attr('class', function (d) {
                    var classes = 'branch-tag';
                    if (d.name.indexOf('/') >= 0) {
                        classes += ' remote-branch';
                    } else if (d.name.toUpperCase() === 'HEAD') {
                        classes += ' head-tag';
                    }
                    return classes;
                });

            newTags.append('svg:rect')
                .attr('width', function (d) {
                    return (d.name.length * 6) + 10;
                })
                .attr('height', 20)
                .attr('y', function (d) { return tagY(d, view); })
                .attr('x', function (d) {
                    var commit = view.getCommit(d.commit),
                        width = Number(d3.select(this).attr('width'));

                    return commit.cx - (width / 2);
                });

            newTags.append('svg:text')
                .text(function (d) { return d.name; })
                .attr('y', function (d) {
                    return tagY(d, view) + 14;
                })
                .attr('x', function (d) {
                    var commit = view.getCommit(d.commit);
                    return commit.cx;
                });
        },

        _setCurrentBranch: function (branch) {
            var display = this.svg.select('text.current-branch-display');

            if (branch) {
                display.text('Current Branch: ' + branch);
            } else {
                display.text('Current Branch: DETACHED HEAD');
            }

            this.currentBranch = branch;
        },

        _moveTag: function (tag, ref) {
            var currentLoc = this.getCommit(tag),
                newLoc = this.getCommit(ref);

            if (currentLoc) {
                currentLoc.tags.splice(currentLoc.tags.indexOf(tag), 1);
            }

            newLoc.tags.push(tag);

            return this;
        },

        commit: function (commit) {
            commit = commit || {};

            !commit.id && (commit.id = HistoryView.generateId());
            !commit.tags && (commit.tags = []);

            if (!commit.parent) {
                if (!this.currentBranch) {
                    throw new Error('Not a good idea to make commits while in a detached HEAD state.');
                }

                commit.parent = this.getCommit(this.currentBranch).id;
            }

            this.commitData.push(commit);
            this._moveTag(this.currentBranch, commit.id);

            this._renderCommits();

            this.checkout(this.currentBranch);
            return this;
        },

        branch: function (name) {
            if (!name || name.trim() === '') {
                throw new Error('You need to give a branch name.');
            }

            if (name.indexOf(' ') > -1) {
                throw new Error('Branch names cannot contain spaces.');
            }

            if (this.branches.indexOf(name) > -1) {
                throw new Error('Branch "' + name + '" already exists.');
            }

            this.getCommit('HEAD').tags.push(name);
            this._renderTags();
            return this;
        },

        checkout: function (ref) {
            var commit = this.getCommit(ref);

            var previousHead = this.getCircle('HEAD'),
                newHead = this.getCircle(commit.id);

            if (previousHead && !previousHead.empty()) {
                previousHead.style('fill', '#EEE').style('stroke', '#888');
            }

            this._setCurrentBranch(ref === commit.id ? null : ref);
            this._moveTag('HEAD', commit.id);
            this._renderTags();

            newHead.style('fill', '#CCFFCC').style('stroke', '#339900');

            return this;
        },
        
        reset: function (ref) {
            var commit = this.getCommit(ref);

            if (this.currentBranch) {
                this._moveTag(this.currentBranch, commit.id);
                this.checkout(this.currentBranch);
            } else {
                this.checkout(commit.id);
            }

            return this;
        }

    };

    return HistoryView;
});