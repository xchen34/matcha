INSERT INTO
    tags (name)
VALUES
    ('#art'),
    ('#music'),
    ('#sport'),
    ('#travel'),
    ('#food'),
    ('#gaming'),
    ('#cinema'),
    ('#reading'),
    ('#photography'),
    ('#fashion'),
    ('#coding'),
    ('#nature'),
    ('#dance'),
    ('#fitness'),
    ('#coffee'),
    ('#animals'),
    ('#cars'),
    ('#science'),
    ('#anime'),
    ('#design') ON CONFLICT (name) DO NOTHING;