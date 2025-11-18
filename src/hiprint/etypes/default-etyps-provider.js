export default function (hiprint) {
  return function (options) {
    var addElementTypes = function (context) {
      context.removePrintElementTypes("defaultModule");
      context.addPrintElementTypes("defaultModule", [
        new hiprint.PrintElementTypeGroup("常規", [
          {
            tid: "defaultModule.text",
            title: "文本",
            data: "",
            type: "text"
          },
          {
            tid: "defaultModule.image",
            title: "圖片",
            data: "",
            type: "image"
          },
          {
            tid: "defaultModule.longText",
            title: "長文",
            data: "155123456789",
            type: "longText"
          },
          {
            tid: "defaultModule.table",
            field: "table",
            title: "表格",
            type: "table",
            groupFields: ["name"],
            groupFooterFormatter: function (group, option) {
              return "這裡自訂統計腳資訊";
            },
            columns: [
              [
                {
                  title: "行號",
                  fixed: true,
                  rowspan: 2,
                  field: "id",
                  width: 70
                },
                {title: "人員資訊", colspan: 2},
                {title: "銷售統計", colspan: 2}
              ],
              [
                {
                  title: "姓名",
                  align: "left",
                  field: "name",
                  width: 100
                },
                {title: "性別", field: "gender", width: 100},
                {
                  title: "銷售數量",
                  field: "count",
                  width: 100
                },
                {
                  title: "銷售金額",
                  field: "amount",
                  width: 100
                }
              ]
            ],
            editable: true,
            columnDisplayEditable: true,//列顯示是否能編輯
            columnDisplayIndexEditable: true,//列順序顯示是否能編輯
            columnTitleEditable: true,//列標題是否能編輯
            columnResizable: true, //列寬是否能調整
            columnAlignEditable: true,//列對齊是否調整
            isEnableEditField: true, //編輯欄位
            isEnableContextMenu: true, //開啟右鍵菜單 默認true
            isEnableInsertRow: true, //插入行
            isEnableDeleteRow: true, //刪除行
            isEnableInsertColumn: true, //插入列
            isEnableDeleteColumn: true, //刪除列
            isEnableMergeCell: true, //合併單元格
          },
          {
            tid: "defaultModule.emptyTable",
            title: "空白表格",
            type: "table",
            columns: [
              [
                {
                  title: "",
                  field: "",
                  width: 100
                },
                {
                  title: "",
                  field: "",
                  width: 100
                }
              ]
            ],
          },
          {
            tid: "defaultModule.html",
            title: "html",
            formatter: function (data, options) {
              return '<div style="height:50pt;width:50pt;background:red;border-radius: 50%;"></div>';
            },
            type: "html"
          },
          {
            tid: "defaultModule.customText",
            title: "自訂文本",
            customText: "自訂文本",
            custom: true,
            type: "text"
          }
        ]),
        new hiprint.PrintElementTypeGroup("輔助", [
          {
            tid: "defaultModule.hline",
            title: "橫線",
            type: "hline"
          },
          {
            tid: "defaultModule.vline",
            title: "豎線",
            type: "vline"
          },
          {
            tid: "defaultModule.rect",
            title: "矩形",
            type: "rect"
          },
          {
            tid: "defaultModule.oval",
            title: "橢圓",
            type: "oval"
          },
          {
            tid: 'defaultModule.barcode',
            title: '條碼',
            type: 'barcode',
          },
          {
            tid: 'defaultModule.qrcode',
            title: '二維碼',
            type: 'qrcode',
          }
        ])
      ]);
    };
    return {
      addElementTypes: addElementTypes
    };
  };
};
