import { rollDice } from "../scripts/roll-dice.js";
import { DiceRoll } from "../scripts/roll-dice.js";

export class Soak {
    constructor(actor) {
        this.canRoll = false;
        this.close = false;

        this.difficulty = 6;
        this.bonus = 0;

        this.damageKey = "";
        this.attributeValue = 0;
        this.attributeBonus = 0;

        this.soaktype = "normal";
        this.useChimerical = actor.system.listdata.settings.haschimericalhealth;

        this.sheettype = "";
    }
}

export class DialogSoakRoll extends FormApplication {
    constructor(actor, roll) {
        super(roll, {submitOnChange: true, closeOnSubmit: false});
        this.actor = actor;    
        this.isDialog = true;   
        this.options.title = `${this.actor.name}`;
    }

    /**
        * Extend and override the default options used by the 5e Actor Sheet
        * @returns {Object}
    */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["soak-dialog"],
            template: "systems/worldofdarkness/templates/dialogs/dialog-soak.html",
            closeOnSubmit: false,
            submitOnChange: true,
            resizable: true
        });
    }

    getData() {
        const data = super.getData();
        data.actorData = this.actor.system;  
        data.actorData.type = this.actor.type; 
        data.config = CONFIG.wod;

        if (data.actorData.type != CONFIG.wod.sheettype.changingbreed) {
            data.object.sheettype = data.actorData.type.toLowerCase() + "Dialog";
        }
        else {
            data.object.sheettype = "werewolfDialog";
        }

        if (data.object.damageKey != "") {
            if (data.object.soaktype == "normal") {
                data.object.attributeValue = parseInt(data.actorData.soak[data.object.damageKey]);
                data.object.attributeBonus = parseInt(data.actorData.settings.soak[data.object.damageKey].bonus);
            }
            else if (data.object.soaktype == "chimerical") {
                data.object.attributeValue = parseInt(data.actorData.soak.chimerical[data.object.damageKey]);
                data.object.attributeBonus = parseInt(data.actorData.settings.soak.chimerical[data.object.damageKey].bonus);
            }
        }
        else {
            data.object.attributeValue = 0;
            data.object.attributeBonus = 0;
        }

        this.render(false);

        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);

        html
            .find('.dialog-difficulty-button')
            .click(this._setDifficulty.bind(this));   
            
        html
            .find('.dialog-attribute-button')
            .click(this._setDamageType.bind(this));

        html
            .find('.actionbutton')
            .click(this._soakRoll.bind(this));

        html
            .find('.closebutton')
            .click(this._closeForm.bind(this));
    }

    async _updateObject(event, formData) {
        if (this.object.close) {
            this.close();
            return;
        }

        event.preventDefault();              
        
        try {
            this.object.bonus = parseInt(formData["bonus"]);
        }
        catch {
            this.object.bonus = 0;
        }

        this.object.canRoll = this.object.damageKey != "" ? true : false;  

        this.getData();
    }

    _setDifficulty(event) {
        const element = event.currentTarget;
        const parent = $(element.parentNode);
        const steps = parent.find(".dialog-difficulty-button");
        const index = parseInt(element.value);   

        this.object.difficulty = index;   
        this.object.canRoll = this.object.damageKey != "" ? true : false;         

        if (index < 0) {
            return;
        }

        steps.removeClass("active");

        steps.each(function (i) {
            if (this.value == index) {
                $(this).addClass("active");
            }
        });
    }

    _setDamageType(event) {
        const element = event.currentTarget;
        const parent = $(element.parentNode);
        const steps = parent.find(".dialog-attribute-button");
        const key = element.value;        

        if (key == "") {
            steps.removeClass("active");
            return;
        }

        const dataset = element.dataset;
        const type = dataset.type;

        this.object.damageKey = key;
        this.object.soaktype = type;

        steps.removeClass("active");

        steps.each(function (i) {
            if (this.value == key) {
                $(this).addClass("active");
            }
        });
    }

    /* clicked to roll */
    _soakRoll(event) {
        if (this.object.close) {
            this.close();
            return;
        }

        this.object.canRoll = this.object.damageKey != "" ? true : false;     

        if (!this.object.canRoll) {
            ui.notifications.warn(game.i18n.localize("wod.dialog.soak.missingdamage"));
            return;
        }

        let numDices = parseInt(this.object.attributeValue) + parseInt(this.object.bonus) + parseInt(this.object.attributeBonus);        

        let templateHTML = `<h2>${game.i18n.localize("wod.dice.rollingsoak")}</h2>`;

        templateHTML += `<strong>`;

        templateHTML += `${game.i18n.localize(CONFIG.wod.damageTypes[this.object.damageKey])}`;

        if (this.object.soaktype == "chimerical") {
            templateHTML += ` ${game.i18n.localize('wod.health.chimerical')}`;
        }
        
        templateHTML += ` (${this.object.attributeValue}`;

        if (this.object.attributeBonus > 0) {
            templateHTML += ` + ${this.object.attributeBonus}`;
        }

        if (this.object.bonus > 0) {
            templateHTML += ` + ${this.object.bonus}`;
        }

        templateHTML += `)</strong>`;    
        
        const soakRoll = new DiceRoll(this.actor);
        soakRoll.attribute = "stamina";
        soakRoll.handlingOnes = CONFIG.wod.handleOnes;
        soakRoll.numDices = parseInt(numDices);
        soakRoll.difficulty = parseInt(this.object.difficulty);
        soakRoll.templateHTML = templateHTML;
        soakRoll.origin = "soak";

        rollDice(soakRoll);
        this.object.close = true;
    }

    /* clicked to close form */
    _closeForm(event) {
        this.object.close = true;
    }    

}
