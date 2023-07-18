import * as _Shared from "./shared.js";
let _rawWasm = _Shared.DecodeBase64("AGFzbQEAAAABIQZgAAF/YAF/AX9gA39/fwBgA39/fwF/YAF/AGACf38BfwMYFwABAgMEBQAAAAAAAAAAAAAAAAAAAAAABQQBAQEKBhsFfwBB2AELfwFBAAt/AUEAC38BQQALfwFBAAsHjwIWBm1lbW9yeQIABWlucHV0AwAFcmVhY2gDBAtpbnB1dExlbmd0aAMBBV9pbml0AAAJYXR0cmlidXRlAAYPcGFydGlhbEpzb25QYXRoAAcKaWRlbnRpZmllcgAIBWRpZ2l0AAkGbnVtYmVyAAoLYXNzb2NpYXRpb24ACwhqc29uUGF0aAAMC2luZGV4QWNjZXNzAA0Ja2V5QWNjZXNzAA4Da2V5AA8Obm9uRW1wdHlTdHJpbmcAEBBlc2NhcGVkQ2hhcmFjdGVyABEZYW55RXhjZXB0UXVvdGVPckJhY2tzbGFzaAASD2Nhc3RPck1vZGlmaWVycwATBGNhc3QAFAhtb2RpZmllcgAVA2FueQAWCuM0FxYAQQAkA0EAJAQjAUHYAWoQASQCIwILCgAgAEEDakF8cQsjAQF/A0AgACADaiABIANqLQAAOgAAIANBAWoiAyACSA0ACwtBAQF/IABB2AFqIQNBACEAA0ACQCAAIANqLQAAIAAgAWotAABHDQAgAEEBaiIAIAJODQAjAiAAIANqSg0BCwsgAAsOACAAIwROBEAgACQECwtYAQN/IAEhBEEBIQIDQCAAKAIABH8gAiAAKAIQaiECIABBFGoFIAEgAEEUaiAAKAIQIgMQAiABIANqIQEgACADQRRqahABCyEAIAJBAWsiAg0ACyABIARrC/sCAQN/IwIiAiMDNgIIIAJBFGokAiMCIQAQCyIBQQFGBEAgACQCBSAAIAAgAEEUahAFNgIQIABBADYCACAAQQc2AgQgACAAKAIQQRRqahABJAILAkAgAUUNACMCIQAQCCIBQQFGBEAgACQCBSAAIAAgAEEUahAFNgIQIABBADYCACAAQQc2AgQgACAAKAIQQRRqahABJAILIAFFDQALAkAgAUEBRg0AQQAhACMCIgEjAzYCCCABQRRqJAIDQBAMQQFHBEAgAEEBaiIAQQFHDQELCyABQQw2AgAgAUEGNgIEIAEjAzYCDCABIAA2AhBBACEBQQANAEEAIQAjAiIBIwM2AgggAUEUaiQCA0AQE0EBRwRAIABBAWoiAEEBRw0BCwsgAUEMNgIAIAFBBjYCBCABIwM2AgwgASAANgIQQQAhAUEADQALIAFBAUYEQEEBIQEgAigCCCQDIAIkAgUgAkEeNgIAIAJBCTYCBCACIwM2AgwgAkEDNgIQCyABC/sCAQN/IwIiAiMDNgIIIAJBFGokAiMCIQAQDSIBQQFGBEAgACQCBSAAIAAgAEEUahAFNgIQIABBADYCACAAQQc2AgQgACAAKAIQQRRqahABJAILAkAgAUUNACMCIQAQDyIBQQFGBEAgACQCBSAAIAAgAEEUahAFNgIQIABBADYCACAAQQc2AgQgACAAKAIQQRRqahABJAILIAFFDQALAkAgAUEBRg0AQQAhACMCIgEjAzYCCCABQRRqJAIDQBAMQQFHBEAgAEEBaiIAQQFHDQELCyABQQw2AgAgAUEGNgIEIAEjAzYCDCABIAA2AhBBACEBQQANAEEAIQAjAiIBIwM2AgggAUEUaiQCA0AQE0EBRwRAIABBAWoiAEEBRw0BCwsgAUEMNgIAIAFBBjYCBCABIwM2AgwgASAANgIQQQAhAUEADQALIAFBAUYEQEEBIQEgAigCCCQDIAIkAgUgAkEnNgIAIAJBDzYCBCACIwM2AgwgAkEDNgIQCyABC+4EAQd/IwIiAyMDNgIIIANBFGokAgJAAn8jAiIEIwM2AgggBEEUaiQCA0BBACECQQAhASMCIgAjAzYCCAJAIwMjAU4NACMDQdgBai0AACIGQcEASSAGQdoAS3INACABQQFqIQEjA0EBaiQDCyMDEAQCQCABQQBMBEBBASECIAAoAggkAyAAJAIMAQsgAEEANgIAIABBBzYCBCAAIwM2AgwgACABNgIQIABBFGogACgCCEHYAWogARACIAAgAUEUamoQASQCCwJAIAJFDQBBACECQQAhASMCIgAjAzYCCAJAIwMjAU4NACMDQdgBai0AACIGQeEASSAGQfoAS3INACABQQFqIQEjA0EBaiQDCyMDEAQCQCABQQBMBEBBASECIAAoAggkAyAAJAIMAQsgAEEANgIAIABBBzYCBCAAIwM2AgwgACABNgIQIABBFGogACgCCEHYAWogARACIAAgAUEUamoQASQCCyACRQ0AEAkiAkUNAEEAIQIjAiIAIwM2AggjA0E4QQEQAyEBIAEjA2okAyMDEAQCQCABQQFHBEBBASECIAAoAggkAyAAJAIMAQsjAkEANgIAIwJBBzYCBCMCIwM2AgwjAkEBNgIQIABBFGpBOEEBEAIgAEEVahABJAILIAJFDQALIAJBAUZFBEAgBUEBaiEFDAELCyAFQQBMBEAgBCgCCCQDIAQkAkEBDAELIARBGDYCACAEQQY2AgQgBCMDNgIMIAQgBTYCEEEACyICQQFGDQALIAJBAUYEQEEBIQIgAygCCCQDIAMkAgUgA0E5NgIAIANBCjYCBCADIwM2AgwgA0EBNgIQCyACC+ABAQV/IwIiASMDNgIIIAFBFGokAiMCIgAjAzYCCAJAIwMjAU4NACMDQdgBai0AACIEQTBJIARBOUtyDQAgAkEBaiECIwNBAWokAwsjAxAEAkAgAkEATARAQQEhAyAAKAIIJAMgACQCDAELIABBADYCACAAQQc2AgQgACMDNgIMIAAgAjYCECAAQRRqIAAoAghB2AFqIAIQAiAAIAJBFGpqEAEkAgsCQCADDQALIAMEQEEBIQMgASgCCCQDIAEkAgUgAUHEADYCACABQQU2AgQgASMDNgIMIAFBATYCEAsgAwvlAQEEfyMCIgIjAzYCCCACQRRqJAIjAiEBAn8jAiIAIwM2AgggAEEUaiQCA0AQCUEBRkUEQCADQQFqIQMMAQsLIANBAEwEQCAAKAIIJAMgACQCQQEMAQsgAEEYNgIAIABBBjYCBCAAIwM2AgwgACADNgIQQQALIgAEQCABJAIFIAEgASABQRRqEAU2AhAgAUEANgIAIAFBBzYCBCABIAEoAhBBFGpqEAEkAgsCQCAADQALIAAEQEEBIQAgAigCCCQDIAIkAgUgAkHJADYCACACQQY2AgQgAiMDNgIMIAJBATYCEAsgAAvRBAEHfyMCIgQjAzYCCCAEQRRqJAIjAiMCIgAjAzYCCCMDQc8AQQEQAyECIAIjA2okAyMDEAQCQCACQQFHBEBBASEBIAAoAggkAyAAJAIMAQsjAkEANgIAIwJBBzYCBCMCIwM2AgwjAkEBNgIQIABBFGpBzwBBARACIABBFWoQASQCCyQCAkAgAUEBRg0AEAgiAUEBRg0AIwIiAiMDNgIIIAJBFGokAgNAIwIiACMDNgIIIABBFGokAiMCIgMjAzYCCCMDQdAAQQEQAyEGIAYjA2okAyMDEAQCQCAGQQFHBEBBASEBIAMoAggkAyADJAIMAQsjAkEANgIAIwJBBzYCBCMCIwM2AgwjAkEBNgIQIANBFGpB0ABBARACIANBFWoQASQCCwJAIAFBAUYNABAIIgFBAUYNAAsgAUEBRgRAQQEhASAAKAIIJAMgACQCBSAAQQc2AgAgAEEFNgIEIAAjAzYCDCAAQQI2AhALIAFBAUZFBEAgBUEBaiEFDAELCyACQRI2AgAgAkEGNgIEIAIjAzYCDCACIAU2AhBBACEBQQANACMCIwIiACMDNgIIIwNBzwBBARADIQIgAiMDaiQDIwMQBAJAIAJBAUcEQEEBIQEgACgCCCQDIAAkAgwBCyMCQQA2AgAjAkEHNgIEIwIjAzYCDCMCQQE2AhAgAEEUakHPAEEBEAIgAEEVahABJAILJAIgAUEBRg0ACyABQQFGBEBBASEBIAQoAggkAyAEJAIFIARB0QA2AgAgBEELNgIEIAQjAzYCDCAEQQI2AhALIAELuwIBBX8jAiICIwM2AgggAkEUaiQCAkACfyMCIgMjAzYCCCADQRRqJAIDQCMCIQAQDSIBQQFGBEAgACQCBSAAIAAgAEEUahAFNgIQIABBADYCACAAQQc2AgQgACAAKAIQQRRqahABJAILAkAgAUUNACMCIQAQDiIBQQFGBEAgACQCBSAAIAAgAEEUahAFNgIQIABBADYCACAAQQc2AgQgACAAKAIQQRRqahABJAILIAFFDQALIAFBAUZFBEAgBEEBaiEEDAELCyAEQQBMBEAgAygCCCQDIAMkAkEBDAELIANBGDYCACADQQY2AgQgAyMDNgIMIAMgBDYCEEEACyIBQQFGDQALIAFBAUYEQEEBIQEgAigCCCQDIAIkAgUgAkHcADYCACACQQg2AgQgAiMDNgIMIAJBATYCEAsgAQvFAgEFfyMCIgIjAzYCCCACQRRqJAIjAiMCIgAjAzYCCCMDQeQAQQEQAyEDIAMjA2okAyMDEAQCQCADQQFHBEBBASEBIAAoAggkAyAAJAIMAQsjAkEANgIAIwJBBzYCBCMCIwM2AgwjAkEBNgIQIABBFGpB5ABBARACIABBFWoQASQCCyQCAkAgAUEBRg0AEAoiAUEBRg0AIwIjAiIAIwM2AggjA0HlAEEBEAMhAyADIwNqJAMjAxAEAkAgA0EBRwRAQQEhASAAKAIIJAMgACQCDAELIwJBADYCACMCQQc2AgQjAiMDNgIMIwJBATYCECAAQRRqQeUAQQEQAiAAQRVqEAEkAgskAiABQQFGDQALIAFBAUYEQEEBIQEgAigCCCQDIAIkAgUgAkHmADYCACACQQs2AgQgAiMDNgIMIAJBATYCEAsgAQvOAQEFfyMCIgAjAzYCCCAAQRRqJAIjAiMCIgIjAzYCCCMDQdAAQQEQAyEDIAMjA2okAyMDEAQCQCADQQFHBEBBASEBIAIoAggkAyACJAIMAQsjAkEANgIAIwJBBzYCBCMCIwM2AgwjAkEBNgIQIAJBFGpB0ABBARACIAJBFWoQASQCCyQCAkAgAUEBRg0AEA8iAUEBRg0ACyABQQFGBEBBASEBIAAoAggkAyAAJAIFIABB8QA2AgAgAEEJNgIEIAAjAzYCDCAAQQE2AhALIAEL8wUBB38jAiIDIwM2AgggA0EUaiQCAkAQECIBRQ0AAn8jAiIEIwM2AgggBEEUaiQCA0BBACEBQQAhAiMCIgAjAzYCCAJAIwMjAU4NACMDQdgBai0AACIGQcEASSAGQdoAS3INACACQQFqIQIjA0EBaiQDCyMDEAQCQCACQQBMBEBBASEBIAAoAggkAyAAJAIMAQsgAEEANgIAIABBBzYCBCAAIwM2AgwgACACNgIQIABBFGogACgCCEHYAWogAhACIAAgAkEUamoQASQCCwJAIAFFDQBBACEBQQAhAiMCIgAjAzYCCAJAIwMjAU4NACMDQdgBai0AACIGQeEASSAGQfoAS3INACACQQFqIQIjA0EBaiQDCyMDEAQCQCACQQBMBEBBASEBIAAoAggkAyAAJAIMAQsgAEEANgIAIABBBzYCBCAAIwM2AgwgACACNgIQIABBFGogACgCCEHYAWogAhACIAAgAkEUamoQASQCCyABRQ0AEAkiAUUNAEEAIQEjAiIAIwM2AggjA0E4QQEQAyECIAIjA2okAyMDEAQCQCACQQFHBEBBASEBIAAoAggkAyAAJAIMAQsjAkEANgIAIwJBBzYCBCMCIwM2AgwjAkEBNgIQIABBFGpBOEEBEAIgAEEVahABJAILIAFFDQBBACEBIwIiACMDNgIIIwNB+gBBARADIQIgAiMDaiQDIwMQBAJAIAJBAUcEQEEBIQEgACgCCCQDIAAkAgwBCyMCQQA2AgAjAkEHNgIEIwIjAzYCDCMCQQE2AhAgAEEUakH6AEEBEAIgAEEVahABJAILIAFFDQALIAFBAUZFBEAgBUEBaiEFDAELCyAFQQBMBEAgBCgCCCQDIAQkAkEBDAELIARBGDYCACAEQQY2AgQgBCMDNgIMIAQgBTYCEEEACyIBRQ0ACwJAIAFBAUYNAAsgAUEBRgRAQQEhASADKAIIJAMgAyQCBSADQfsANgIAIANBAzYCBCADIwM2AgwgA0EBNgIQCyABC78EAQd/IwIiBCMDNgIIIARBFGokAiMCIQMjAiIFIwM2AgggBUEUaiQCIwIjAiIAIwM2AggjA0H+AEEBEAMhAiACIwNqJAMjAxAEAkAgAkEBRwRAQQEhASAAKAIIJAMgACQCDAELIwJBADYCACMCQQc2AgQjAiMDNgIMIwJBATYCECAAQRRqQf4AQQEQAiAAQRVqEAEkAgskAgJAIAFBAUYNAAJ/QQAhAiMCIgAjAzYCCCAAQRRqJAIDQAJAEBIiAUUNABARIgFFDQALIAFBAUZFBEAgAkEBaiECDAELCyACQQBMBEAgACgCCCQDIAAkAkEBDAELIABBGDYCACAAQQY2AgQgACMDNgIMIAAgAjYCEEEACyIBQQFGDQAjAiMCIgAjAzYCCCMDQf4AQQEQAyECIAIjA2okAyMDEAQCQCACQQFHBEBBASEBIAAoAggkAyAAJAIMAQsjAkEANgIAIwJBBzYCBCMCIwM2AgwjAkEBNgIQIABBFGpB/gBBARACIABBFWoQASQCCyQCIAFBAUYNAAsgAUEBRgRAQQEhASAFKAIIJAMgBSQCBSAFQQc2AgAgBUEFNgIEIAUjAzYCDCAFQQE2AhALIAFBAUYEQCADJAIFIAMgAyADQRRqEAU2AhAgA0EANgIAIANBBzYCBCADIAMoAhBBFGpqEAEkAgsCQCABQQFGDQALIAFBAUYEQEEBIQEgBCgCCCQDIAQkAgUgBEH/ADYCACAEQQ42AgQgBCMDNgIMIARBATYCEAsgAQuwAwEFfyMCIgMjAzYCCCADQRRqJAIjAiMCIgAjAzYCCCMDQY0BQQEQAyECIAIjA2okAyMDEAQCQCACQQFHBEBBASEBIAAoAggkAyAAJAIMAQsjAkEANgIAIwJBBzYCBCMCIwM2AgwjAkEBNgIQIABBFGpBjQFBARACIABBFWoQASQCCyQCAkAgAQ0AQQAhASMCIgAjAzYCCCMDQf4AQQEQAyECIAIjA2okAyMDEAQCQCACQQFHBEBBASEBIAAoAggkAyAAJAIMAQsjAkEANgIAIwJBBzYCBCMCIwM2AgwjAkEBNgIQIABBFGpB/gBBARACIABBFWoQASQCCwJAIAFFDQBBACEBIwIiACMDNgIIIwNBjQFBARADIQIgAiMDaiQDIwMQBAJAIAJBAUcEQEEBIQEgACgCCCQDIAAkAgwBCyMCQQA2AgAjAkEHNgIEIwIjAzYCDCMCQQE2AhAgAEEUakGNAUEBEAIgAEEVahABJAILIAFFDQALIAENAAsgAQRAQQEhASADKAIIJAMgAyQCBSADQY4BNgIAIANBEDYCBCADIwM2AgwgA0EBNgIQCyABC90DAQZ/IwIiBCMDNgIIIARBFGokAgJAAn8jAiIAIwM2AgggACMENgIMIABBFGokAgJAIwMjAU4NACMCIgIjAzYCCCMDQf4AQQEQAyEFIAUjA2okAyMDEAQCQCAFQQFHBEBBASEBIAIoAggkAyACJAIMAQsjAkEANgIAIwJBBzYCBCMCIwM2AgwjAkEBNgIQIAJBFGpB/gBBARACIAJBFWoQASQCCwJAIAFFDQBBACEBIwIiAiMDNgIIIwNBjQFBARADIQUgBSMDaiQDIwMQBAJAIAVBAUcEQEEBIQEgAigCCCQDIAIkAgwBCyMCQQA2AgAjAkEHNgIEIwIjAzYCDCMCQQE2AhAgAkEUakGNAUEBEAIgAkEVahABJAILIAFFDQALIAFFDQAgA0EBaiEDIwNBAWokAwsgACgCDCQEIAAoAgggA2oQBCADQQBMBEAgACgCCCQDIAAkAkEBDAELIAAoAgggA2okAyAAQQA2AgAgAEEHNgIEIAAjAzYCDCAAIAM2AhAgAEEUaiAAKAIIQdgBaiADEAIgACADQRRqahABJAJBAAsiAQ0ACyABBEBBASEBIAQoAggkAyAEJAIFIARBngE2AgAgBEEZNgIEIAQjAzYCDCAEQQE2AhALIAELuwIBBX8jAiICIwM2AgggAkEUaiQCAkACfyMCIgMjAzYCCCADQRRqJAIDQCMCIQAQFCIBQQFGBEAgACQCBSAAIAAgAEEUahAFNgIQIABBADYCACAAQQc2AgQgACAAKAIQQRRqahABJAILAkAgAUUNACMCIQAQFSIBQQFGBEAgACQCBSAAIAAgAEEUahAFNgIQIABBADYCACAAQQc2AgQgACAAKAIQQRRqahABJAILIAFFDQALIAFBAUZFBEAgBEEBaiEEDAELCyAEQQBMBEAgAygCCCQDIAMkAkEBDAELIANBGDYCACADQQY2AgQgAyMDNgIMIAMgBDYCEEEACyIBQQFGDQALIAFBAUYEQEEBIQEgAigCCCQDIAIkAgUgAkG3ATYCACACQQ82AgQgAiMDNgIMIAJBATYCEAsgAQvOAQEFfyMCIgAjAzYCCCAAQRRqJAIjAiMCIgIjAzYCCCMDQcYBQQIQAyEDIAMjA2okAyMDEAQCQCADQQJHBEBBASEBIAIoAggkAyACJAIMAQsjAkEANgIAIwJBBzYCBCMCIwM2AgwjAkECNgIQIAJBFGpBxgFBAhACIAJBFmoQASQCCyQCAkAgAUEBRg0AEAgiAUEBRg0ACyABQQFGBEBBASEBIAAoAggkAyAAJAIFIABByAE2AgAgAEEENgIEIAAjAzYCDCAAQQE2AhALIAELzgEBBX8jAiIAIwM2AgggAEEUaiQCIwIjAiICIwM2AggjA0HMAUEBEAMhAyADIwNqJAMjAxAEAkAgA0EBRwRAQQEhASACKAIIJAMgAiQCDAELIwJBADYCACMCQQc2AgQjAiMDNgIMIwJBATYCECACQRRqQcwBQQEQAiACQRVqEAEkAgskAgJAIAFBAUYNABAIIgFBAUYNAAsgAUEBRgRAQQEhASAAKAIIJAMgACQCBSAAQc0BNgIAIABBCDYCBCAAIwM2AgwgAEEBNgIQCyABC/IBAQN/IwIiAiMDNgIIIAJBFGokAgJAAn8jAiIAIwM2AgggACMENgIMIABBFGokAgJ/QQAjAyMBTg0AGiMDQQFqJAMgAUEBagshASAAKAIMJAQgACgCCCABahAEIAFBAEwEQCAAKAIIJAMgACQCQQEMAQsgACgCCCABaiQDIABBADYCACAAQQc2AgQgACMDNgIMIAAgATYCECAAQRRqIAAoAghB2AFqIAEQAiAAIAFBFGpqEAEkAkEACyIADQALIAAEQEEBIQAgAigCCCQDIAIkAgUgAkHVATYCACACQQM2AgQgAiMDNgIMIAJBATYCEAsgAAsLoAMjAEEACwdsaXRlcmFsAEEHCwUoLi4uKQBBDAsGKC4uLik/AEESCwYoLi4uKSoAQRgLBiguLi4pKwBBHgsJYXR0cmlidXRlAEEnCw9wYXJ0aWFsSnNvblBhdGgAQTYLAUEAQTcLAWEAQTgLAV8AQTkLCmlkZW50aWZpZXIAQcMACwEwAEHEAAsFZGlnaXQAQckACwZudW1iZXIAQc8ACwEkAEHQAAsBLgBB0QALC2Fzc29jaWF0aW9uAEHcAAsIanNvblBhdGgAQeQACwFbAEHlAAsBXQBB5gALC2luZGV4QWNjZXNzAEHxAAsJa2V5QWNjZXNzAEH6AAsBLQBB+wALA2tleQBB/gALASIAQf8ACw5ub25FbXB0eVN0cmluZwBBjQELAVwAQY4BCxBlc2NhcGVkQ2hhcmFjdGVyAEGeAQsZYW55RXhjZXB0UXVvdGVPckJhY2tzbGFzaABBtwELD2Nhc3RPck1vZGlmaWVycwBBxgELAjo6AEHIAQsEY2FzdABBzAELAToAQc0BCwhtb2RpZmllcgBB1QELA2FueQ==");
let _ctx = null;
if (typeof window === 'undefined') {
	_ctx = new WebAssembly.Instance(
		new WebAssembly.Module(
			_rawWasm
		), {js: {print_i32: console.log}}
	);
}
let ready = new Promise(async (res) => {
	if (typeof window !== 'undefined') {
		_ctx = await WebAssembly.instantiate(
			await WebAssembly.compile(_rawWasm),
			{js: {print_i32: console.log}}
		);
	}

	Object.freeze(_ctx);
	_rawWasm = null;
	res();
});
export { ready };
export function Parse_Attribute (data, refMapping = true) {
	return _Shared.Parse(_ctx, data, refMapping, "attribute");
}
export function Parse_PartialJsonPath (data, refMapping = true) {
	return _Shared.Parse(_ctx, data, refMapping, "partialJsonPath");
}
export function Parse_Identifier (data, refMapping = true) {
	return _Shared.Parse(_ctx, data, refMapping, "identifier");
}
export function Parse_Digit (data, refMapping = true) {
	return _Shared.Parse(_ctx, data, refMapping, "digit");
}
export function Parse_Number (data, refMapping = true) {
	return _Shared.Parse(_ctx, data, refMapping, "number");
}
export function Parse_Association (data, refMapping = true) {
	return _Shared.Parse(_ctx, data, refMapping, "association");
}
export function Parse_JsonPath (data, refMapping = true) {
	return _Shared.Parse(_ctx, data, refMapping, "jsonPath");
}
export function Parse_IndexAccess (data, refMapping = true) {
	return _Shared.Parse(_ctx, data, refMapping, "indexAccess");
}
export function Parse_KeyAccess (data, refMapping = true) {
	return _Shared.Parse(_ctx, data, refMapping, "keyAccess");
}
export function Parse_Key (data, refMapping = true) {
	return _Shared.Parse(_ctx, data, refMapping, "key");
}
export function Parse_NonEmptyString (data, refMapping = true) {
	return _Shared.Parse(_ctx, data, refMapping, "nonEmptyString");
}
export function Parse_EscapedCharacter (data, refMapping = true) {
	return _Shared.Parse(_ctx, data, refMapping, "escapedCharacter");
}
export function Parse_AnyExceptQuoteOrBackslash (data, refMapping = true) {
	return _Shared.Parse(_ctx, data, refMapping, "anyExceptQuoteOrBackslash");
}
export function Parse_CastOrModifiers (data, refMapping = true) {
	return _Shared.Parse(_ctx, data, refMapping, "castOrModifiers");
}
export function Parse_Cast (data, refMapping = true) {
	return _Shared.Parse(_ctx, data, refMapping, "cast");
}
export function Parse_Modifier (data, refMapping = true) {
	return _Shared.Parse(_ctx, data, refMapping, "modifier");
}
export function Parse_Any (data, refMapping = true) {
	return _Shared.Parse(_ctx, data, refMapping, "any");
}