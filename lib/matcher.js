var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;
var SPECIAL = {
    'INPUT': true,
    // ...
};

module.exports = function (selector) {
    return new Match(selector);
};

function Match (selector) {
    this.selector = selector;
    this.index = 0;
    this.current = null;
    this.matched = false;
    this.startLevel = null;
    this.stack = [];
    this.operator = null;
}

inherits(Match, EventEmitter);

Match.prototype.next = function () {
    if (/^[>\+]$/.test(this.selector[this.index+1])) {
        this.operator = this.selector[++this.index];
    }
    else {
        this.operator = ' ';
    }
    
    if (++ this.index === this.selector.length) {
        this.emit('open', this.current);
        this.matched = true;
        //this.unmatch();
    }
};

Match.prototype.unmatch = function () {
    this.index = 0;
    this.current = null;
    this.matched = false;
    this.startLevel = null;
};

Match.prototype.at = function (kind, node) {
    var sel = this.selector[this.index];
    if (kind === 'tag-begin' && !node.isSelfClosing
    && !SPECIAL[node.name]) {
        this.stack.push(node.name);
    }
    else if (kind === 'closetag') {
        for (var i = this.stack.length - 1; i >= 0; i--) {
            if (this.stack[i] === node) {
                this.stack.splice(i);
                break;
            }
        }
        if (this.operator === '+') {
            if (this.stack.length < this.startLevel) {
                this.unmatch();
            }
        }
        else if (this.stack.length <= this.startLevel) {
            this.unmatch();
        }
    }
    
    if (kind === 'tag-begin') {
        var matched = matchSelector(sel, node);
        if (matched) {
            this.current = node;
            this.next();
            if (this.index === 0) {
                this.startLevel = this.stack.length;
            }
        }
        else if (this.operator === '>') {
            this.unmatch();
        }
    }
    else if (this.matched) {
        this.emit(kind, node);
    }
};
    
function matchSelector (sel, node) {
    if (!sel) return false;
    if (sel.name !== null && sel.name !== '*' && node.name !== sel.name) {
        return false;
    }
    var pendingCount = 0;
    var p = {
        class: sel.class.length && sel.class.slice(),
        id: sel.id,
        pseudo: sel.pseudo,
        exists: sel.attribute.exists,
        equals: sel.attribute.equals,
        contains: sel.attribute.contains,
        begins: sel.attribute.begins
    };
    var pendingCount = Boolean(p.class) + Boolean(p.id)
        + Boolean(p.pseudo) + Boolean(p.exists) + Boolean(p.equals)
        + Boolean(p.contains) + Boolean(p.begins)
    ;
    if (pendingCount === 0) return true;
    
    if (p.class && node.attributes.CLASS) {
        var clist = p.class;
        var classes = node.attributes.CLASS.split(/\s+/);
        for (var i = 0; i < classes.length; i++) {
            var ix = clist.indexOf(classes[i]);
            if (ix >= 0) {
                clist.splice(ix, 1);
                if (clist.length === 0) {
                    if (satisfied('class')) return true;
                }
            }
        }
    }
    
    if (p.id && p.id === node.attributes.ID) {
        if (satisfied('id')) return true;
    }
    if (p.exists && node.attributes[p.exists.toUpperCase()] !== undefined) {
        if (satisfied('exists')) return true;
    }
    
    var x;
    if (p.equals && (x = node.attributes[p.equals[0].toUpperCase()])) {
        if (x === p.equals[1]) {
            if (satisfied('equals')) return true;
        }
    }
    if (p.contains && (x = node.attributes[p.contains[0].toUpperCase()])) {
        if (x.split(/\s+/).indexOf(p.contains[1]) >= 0) {
            if (satisfied('contains')) return true;
        }
    }
    if (p.begins && (x = node.attributes[p.begins[0].toUpperCase()])) {
        if (x.split('-')[0] === p.begins[1]) {
            if (satisfied('begins')) return true;
        }
    }
    
    return false;
    
    function satisfied (name) {
        if (!p[name]) return false;
        p[name] = null;
        if (--pendingCount === 0) return true;
    }
};