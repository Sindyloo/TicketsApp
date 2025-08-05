function doPost(e) {
  return handleRequest(e);
}

function doGet(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    // Obtener los datos (funciona tanto para GET como POST)
    const data = e.parameter;
    console.log('handleRequest llamado con parámetros:', data);
    console.log('Action recibido:', data.action);
    console.log('Tipo de action:', typeof data.action);
    console.log('Action es igual a getData:', data.action === 'getData');
    console.log('Todas las claves de data:', Object.keys(data));
    
    // Verificar si es una solicitud para obtener datos
    if (data.action && data.action.toString() === 'getData') {
      console.log('Entrando a getDataFromSheet');
      return getDataFromSheet(data);
    }
    
    // Verificación alternativa
    if (data.callback && !data.NRO_DE_TICKET && !data.TIPO_TICKET) {
      console.log('Detectado como solicitud de datos por ausencia de campos de ticket');
      return getDataFromSheet(data);
    }
    
    // Si no tiene campos de ticket, asumir que es solicitud de datos
    if (!data.NRO_DE_TICKET && !data.TIPO_TICKET && data.callback) {
      console.log('Solicitud de datos detectada por ausencia de campos obligatorios');
      return getDataFromSheet(data);
    }
    
    console.log('Continuando con appendRow normal');
    // Obtener la hoja de cálculo
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Verificar si es una actualización (tiene originalNroTicket)
    if (data.originalNroTicket) {
      console.log('Actualizando ticket existente:', data.originalNroTicket);
      return updateTicketInSheet(data);
    }
    
    // Preparar datos de seguimiento si existen
    let seguimientoJSON = '';
    let seguimientoTexto = '';
    
    if (data.seguimientosJSON) {
      try {
        const seguimientos = JSON.parse(data.seguimientosJSON);
        seguimientoJSON = data.seguimientosJSON;
        
        // Crear texto formateado para la columna N
        seguimientoTexto = seguimientos.map(seg => {
          const fecha = new Date(seg.fecha);
          const fechaFormateada = Utilities.formatDate(fecha, Session.getScriptTimeZone(), "dd/MM");
          const horaFormateada = Utilities.formatDate(fecha, Session.getScriptTimeZone(), "HH:mm");
          return `${seg.n}. ${seg.segui} (${fechaFormateada} ${horaFormateada})`;
        }).join('\n');
        
        console.log('Seguimientos procesados:', seguimientos);
        console.log('Texto formateado:', seguimientoTexto);
      } catch (error) {
        console.log('Error procesando seguimientos:', error.toString());
      }
    }
    
    // Agregar una nueva fila con todos los campos del ticket
    sheet.appendRow([
      data.NRO_DE_TICKET,
      data.TIPO_TICKET,
      data.CATEGORIA,
      data.SUBCATEGORIA,
      data.SOLICITUD,
      data.DETALLE_SOLICITUD,
      data.ESTADO,
      data.AGENTE_ASIGNADO,
      data.PRIORIDAD,
      data.FECHA_CREACION,
      '', // FECHA ACTUALIZACION (columna K)
      '', // Columna L
      '', // Columna M
      seguimientoTexto, // SEGUIMIENTO (columna N)
      seguimientoJSON // SEGUIMIENTO_JSON (columna O)
    ]);
    
    // Respuesta JSONP
    const callback = data.callback;
    const response = JSON.stringify({success: true});
    
    if (callback) {
      // Respuesta JSONP
      return ContentService
        .createTextOutput(`${callback}(${response})`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      // Respuesta JSON normal
      return ContentService
        .createTextOutput(response)
        .setMimeType(ContentService.MimeType.JSON);
    }
      
  } catch (error) {
    console.log('Error en handleRequest:', error.toString());
    const callback = e.parameter.callback;
    const response = JSON.stringify({success: false, error: error.toString()});
    
    if (callback) {
      return ContentService
        .createTextOutput(`${callback}(${response})`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService
        .createTextOutput(response)
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
}

function getDataFromSheet(data) {
  try {
    console.log('getDataFromSheet llamado');
    
    // Obtener la hoja de cálculo
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    console.log('Hoja obtenida:', sheet.getName());
    
    // Obtener todos los datos (excluyendo la primera fila que son los headers)
    const range = sheet.getDataRange();
    const values = range.getValues();
    console.log('Filas encontradas:', values.length);
    console.log('Primera fila (headers):', values[0]);
    
    // Si solo hay headers, devolver array vacío
    if (values.length <= 1) {
      console.log('Solo hay headers, devolviendo array vacío');
      const response = JSON.stringify({success: true, data: []});
      return ContentService
        .createTextOutput(`${data.callback}(${response})`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    // Convertir los datos a objetos (excluyendo la primera fila)
    const tickets = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      console.log(`Fila ${i}:`, row);
      if (row[0]) { // Solo agregar si hay NRO_DE_TICKET
        const ticket = {
          NRO_DE_TICKET: row[0] || '',
          TIPO_TICKET: row[1] || '',
          CATEGORIA: row[2] || '',
          SUBCATEGORIA: row[3] || '',
          SOLICITUD: row[4] || '',
          DETALLE_SOLICITUD: row[5] || '',
          ESTADO: row[6] || '',
          AGENTE_ASIGNADO: row[7] || '',
          PRIORIDAD: row[8] || '',
          FECHA_CREACION: row[9] || '',
          SEGUIMIENTO: row[13] || '',
          SEGUIMIENTO_JSON: row[14] || ''
        };
        tickets.push(ticket);
        console.log('Ticket agregado:', ticket.NRO_DE_TICKET);
      }
    }
    
    console.log('Total de tickets encontrados:', tickets.length);
    const response = JSON.stringify({success: true, data: tickets});
    console.log('Respuesta final:', response);
    
    return ContentService
      .createTextOutput(`${data.callback}(${response})`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
      
  } catch (error) {
    console.log('Error en getDataFromSheet:', error.toString());
    const response = JSON.stringify({success: false, error: error.toString()});
    return ContentService
      .createTextOutput(`${data.callback}(${response})`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}

function updateTicketInSheet(data) {
  try {
    console.log('updateTicketInSheet llamado');
    console.log('Datos recibidos:', data);
    console.log('originalNroTicket:', data.originalNroTicket);
    console.log('Tipo de originalNroTicket:', typeof data.originalNroTicket);
    
    // Obtener la hoja de cálculo
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const range = sheet.getDataRange();
    const values = range.getValues();
    console.log('Total de filas en la hoja:', values.length);
    console.log('Headers (fila 1):', values[0]);
    
    // Buscar la fila que contiene el ticket original
    let rowIndex = -1;
    const ticketBuscado = data.originalNroTicket.toString().trim();
    
    console.log('Buscando ticket:', ticketBuscado);
    
    for (let i = 1; i < values.length; i++) {
      const ticketEnHoja = values[i][0];
      const ticketEnHojaStr = ticketEnHoja ? ticketEnHoja.toString().trim() : '';
      
      console.log(`Fila ${i}: NRO_DE_TICKET = "${ticketEnHojaStr}" vs buscando "${ticketBuscado}"`);
      console.log(`Comparación exacta: "${ticketEnHojaStr}" === "${ticketBuscado}" = ${ticketEnHojaStr === ticketBuscado}`);
      
      if (ticketEnHojaStr === ticketBuscado) {
        rowIndex = i + 1; // +1 porque getRange usa índices basados en 1
        console.log('¡Ticket encontrado en fila:', rowIndex);
        break;
      }
    }
    
    if (rowIndex === -1) {
      console.log('Ticket no encontrado:', ticketBuscado);
      console.log('Todos los NRO_DE_TICKET en la hoja:');
      for (let i = 1; i < values.length; i++) {
        const ticket = values[i][0];
        const ticketStr = ticket ? ticket.toString().trim() : '';
        console.log(`Fila ${i}: "${ticketStr}" (tipo: ${typeof ticket})`);
      }
      const response = JSON.stringify({success: false, error: 'Ticket no encontrado'});
      return ContentService
        .createTextOutput(`${data.callback}(${response})`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    console.log('Actualizando fila:', rowIndex);
    
    // Obtener la fecha y hora actual
    const fechaActual = new Date();
    const fechaActualFormateada = Utilities.formatDate(fechaActual, Session.getScriptTimeZone(), "dd MMM. yyyy, HH:mm");
    
    // Preparar datos de seguimiento si existen
    let seguimientoJSON = '';
    let seguimientoTexto = '';
    
    if (data.seguimientosJSON) {
      try {
        const seguimientos = JSON.parse(data.seguimientosJSON);
        seguimientoJSON = data.seguimientosJSON;
        
        // Crear texto formateado para la columna N
        seguimientoTexto = seguimientos.map(seg => {
          const fecha = new Date(seg.fecha);
          const fechaFormateada = Utilities.formatDate(fecha, Session.getScriptTimeZone(), "dd/MM");
          const horaFormateada = Utilities.formatDate(fecha, Session.getScriptTimeZone(), "HH:mm");
          return `${seg.n}. ${seg.segui} (${fechaFormateada} ${horaFormateada})`;
        }).join('\n');
        
        console.log('Seguimientos procesados:', seguimientos);
        console.log('Texto formateado:', seguimientoTexto);
      } catch (error) {
        console.log('Error procesando seguimientos:', error.toString());
      }
    }
    
    // Actualizar la fila con los nuevos datos
    const rowData = [
      data.NRO_DE_TICKET,
      data.TIPO_TICKET,
      data.CATEGORIA,
      data.SUBCATEGORIA,
      data.SOLICITUD,
      data.DETALLE_SOLICITUD,
      data.ESTADO,
      data.AGENTE_ASIGNADO,
      data.PRIORIDAD,
      data.FECHA_CREACION
    ];
    
    console.log('Nuevos datos a insertar:', rowData);
    console.log('Fecha de actualización:', fechaActualFormateada);
    
    // Obtener el rango de la fila y actualizarlo
    const rowRange = sheet.getRange(rowIndex, 1, 1, rowData.length);
    rowRange.setValues([rowData]);
    
    // Actualizar la columna FECHA ACTUALIZACION (columna K, índice 10)
    const fechaUpdateRange = sheet.getRange(rowIndex, 11); // Columna K = índice 11
    fechaUpdateRange.setValue(fechaActualFormateada);
    
    // Actualizar columnas de seguimiento si existen datos
    if (seguimientoJSON) {
      // Actualizar SEGUIMIENTO (columna N, índice 13)
      const seguimientoRange = sheet.getRange(rowIndex, 14); // Columna N = índice 14
      seguimientoRange.setValue(seguimientoTexto);
      
      // Actualizar SEGUIMIENTO_JSON (columna O, índice 14)
      const seguimientoJSONRange = sheet.getRange(rowIndex, 15); // Columna O = índice 15
      seguimientoJSONRange.setValue(seguimientoJSON);
      
      console.log('Seguimientos actualizados en columnas N y O');
    }
    
    console.log('Ticket actualizado exitosamente');
    const response = JSON.stringify({success: true});
    return ContentService
      .createTextOutput(`${data.callback}(${response})`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
      
  } catch (error) {
    console.log('Error en updateTicketInSheet:', error.toString());
    const response = JSON.stringify({success: false, error: error.toString()});
    return ContentService
      .createTextOutput(`${data.callback}(${response})`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}

// Función de prueba para verificar que el archivo se encuentra
function testFileAccess() {
  try {
    const spreadsheet = SpreadsheetApp.openByName('TicketsMesaAyuda');
    Logger.log('Archivo encontrado: ' + spreadsheet.getName());
    Logger.log('ID del archivo: ' + spreadsheet.getId());
    return true;
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return false;
  }
} 